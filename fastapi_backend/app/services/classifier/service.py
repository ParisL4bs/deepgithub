from fastapi_backend.app.services.llm_service.service import TemplateManager
from fastapi_backend.app.services.classifier.schema import (
    create_file_classification,
    generate_code_structure_model_consize,
    DocumentCompression,
    YamlBrief,
)
from fastapi_backend.app.services.classifier.utils import list_all_files, SAFE
import instructor
import os
import dotenv
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
import concurrent.futures
import google.generativeai as genai
import traceback

dotenv.load_dotenv()


class ClassifierConfig:
    def __init__(self):
        self.template_manager = TemplateManager()
        self.prompts_config = {
            "system_classification": self.template_manager.load_template("prompts/system_prompt_classification.jinja2"),
            "user_classification": self.template_manager.load_template("prompts/user_prompt_classification.jinja2"),
            "system_docstring": self.template_manager.load_template("prompts/prompt_docstrings/system_prompt_classification.jinja2"),
            "user_docstring": self.template_manager.load_template("prompts/prompt_docstrings/user_prompt_classification.jinja2"),
            "system_configuration": self.template_manager.load_template("prompts/prompt_configurations/system_prompt_configuration.jinja2"),
            "user_configuration": self.template_manager.load_template("prompts/prompt_configurations/user_prompt_configuration.jinja2"),
            "system_documentation": self.template_manager.load_template("prompts/prompt_documentations/system_prompt_documentation.jinja2"),
            "user_documentation": self.template_manager.load_template("prompts/prompt_documentations/user_prompt_documentation.jinja2"),
        }
        self.file_class_model_0 = os.getenv("FILE_CLASSICATION_MODEL_0")
        self.file_class_model_1 = os.getenv("FILE_CLASSICATION_MODEL_1")
        self.file_class_model_2 = os.getenv("FILE_CLASSICATION_MODEL_2")
        self.file_class_model_3 = os.getenv("FILE_CLASSICATION_MODEL_3")
        


class ClassifierNode(ClassifierConfig):
    def __init__(self):
        super().__init__()

    def process_batch(
    file_batch: list[str],
    client_gemini,
    model_name,
    symstem_prompt: str,
    user_prompt: str,
    scores: list[int],
    span=None,
    ) -> dict:
        """Process a batch of files using Gemini API"""
        batch_prompt = user_prompt + "\n" + f"{file_batch}"

        messages = [
            {"role": "system", "content": symstem_prompt},
            {"role": "user", "content": batch_prompt},
        ]

        # Simulate a delay with random jitter
        if span:
            generation = span.generation(
                name="gemini",
                model=model_name,
                model_parameters={"temperature": 0, "top_p": 1, "max_new_tokens": 8000},
                input={"system_prompt": symstem_prompt, "user_prompt": batch_prompt},
            )

        try:
            completion, raw = client_gemini.chat.create_with_completion(
                messages=messages,
                response_model=create_file_classification(file_batch, scores),
                generation_config={
                    "temperature": 0.0,
                    "top_p": 1,
                    "candidate_count": 1,
                    "max_output_tokens": 8000,
                },
                max_retries=10,
            )
            result = completion.model_dump()
            # if span:
            #     span.score(name="number_try", value=raw.n_attempts)

        except Exception as e:
            if span:
                generation.end(
                    output=None,
                    status_message=f"Error processing batch: {str(e)}",
                    level="ERROR",
                )
            raise Exception(f"Batch processing failed: {str(e)}, {traceback.format_exc()}")

        if span:
            generation.end(
                output=result,
                usage={
                    "input": raw.usage_metadata.prompt_token_count,
                    "output": raw.usage_metadata.candidates_token_count,
                },
            )

        return result

    #@trace
    def llmclassifier(
        self,
        folder_path: str,
        batch_size: int = 50,  # Number of files to process in each batch
        max_workers: int = 10,  # Number of parallel workers
        GEMINI_API_KEY: str = "",
        ANTHROPIC_API_KEY: str = "",
        OPENAI_API_KEY: str = "",
        trace_id: str = ""
    ) -> str:
        #span = get_langfuse_context().get("span")
        span=None

        scores = [0]

        # Configure safety settings
        safe = SAFE

        # Configure Gemini with API key from request if provided
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
        else:
            # Use default API key from environment
            genai.configure()
            
        client_gemini_0 = instructor.from_gemini(
            client=genai.GenerativeModel(
                model_name=self.file_class_model_0, safety_settings=safe
            ),
            mode=instructor.Mode.GEMINI_JSON,
        )
        client_gemini_1 = instructor.from_gemini(
            client=genai.GenerativeModel(
                model_name=self.file_class_model_1, safety_settings=safe
            ),
            mode=instructor.Mode.GEMINI_JSON,
        )
        client_gemini_2 = instructor.from_gemini(
            client=genai.GenerativeModel(
                model_name=self.file_class_model_2, safety_settings=safe
            ),
            mode=instructor.Mode.GEMINI_JSON,
        )

        clients = {
            0: client_gemini_0,
            1: client_gemini_1,
            2: client_gemini_2,
        }

        model_names = {
            0: self.file_class_model_0,
            1: self.file_class_model_1,
            2: self.file_class_model_2,
        }
        
        

        # Get file names
        files_structure = list_all_files(folder_path, include_md=True)

        file_names = files_structure["all_files_no_path"]
        files_paths = files_structure["all_files_with_path"]

        # Split files into batches
        batches = [
            file_names[i : i + batch_size] for i in range(0, len(file_names), batch_size)
        ]

        all_results = {"file_classifications": []}

        # Process batches in parallel
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_batch = {
                executor.submit(
                    self.process_batch,
                    batch,
                    clients[index % 3],
                    model_names[index % 3],
                    self.prompts_config["system_classification"],
                    self.prompts_config["user_classification"],
                    scores,
                    span,
                ): batch
                for index, batch in enumerate(batches)
            }

            for future in as_completed(future_to_batch):
                try:
                    result = future.result()
                    all_results["file_classifications"].extend(
                        result.get("file_classifications", [])
                    )
                except Exception as e:
                    raise Exception(f"Batch processing failed: {str(e)}, {traceback.format_exc()}")


        # replace file_name by fileç_path
        for classification in all_results["file_classifications"]:
            classification["file_paths"] = files_paths[classification["file_id"]]

        # Combine all results

        return all_results


class InformationCompressorNode(ClassifierConfig):
    def __init__(self):
        super().__init__()
    
    def process_batch(
        file_batch: str,
        client_gemini,
        model_name,
        system_prompt: str,
        user_prompt: str,
        scores: list[int],
        span=None,
        index=None,
        log_name=None,
        fallback_clients: list[instructor.Instructor] = None,
        fallback_model_names: list[str] = None,
    ) -> dict:
        """Process a batch of files using Gemini API with timeout and retries."""
        batch_prompt = ""
        try:
            with open(file_batch, "r") as f:
                batch_prompt = user_prompt + "\n" + f.read()
        except Exception as e:
            print(f"Error reading file {file_batch}: {e}") # Log file reading error
            return None, None

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": batch_prompt},
        ]

        # Simulate a delay with random jitter - Moved outside the retry loop
        # delay = random.uniform(0.1, 0.5)
        # time.sleep(delay) # Consider if this delay is still needed with timeouts

        if log_name == "docstring":
            pydantic_model = generate_code_structure_model_consize(batch_prompt)
        elif log_name == "documentation":
            pydantic_model = DocumentCompression
        else: # config
            pydantic_model = YamlBrief

        # --- Langfuse Span Setup ---
        generation = None
        if span:
            # Create the generation span *before* the retry loop
            generation = span.generation(
                name=f"{log_name}_attempt", # Initial name, might update later
                model=model_name, # Initial model
                model_parameters={"temperature": 0, "top_p": 1, "max_new_tokens": 8000},
                input={"system_prompt": system_prompt, "user_prompt": batch_prompt},
            )

        # --- Retry Logic ---
        max_attempts = 4 # 1 initial + 3 retries
        clients_to_try = [(client_gemini, model_name)] + list(zip(fallback_clients or [], fallback_model_names or []))
        # Ensure we don't try more clients than available or exceed max_attempts
        clients_to_try = clients_to_try[:max_attempts]

        last_exception = None
        last_status_message = ""

        for attempt, (current_client, current_model_name) in enumerate(clients_to_try):
            print(f"Attempt {attempt + 1}/{len(clients_to_try)} for file {file_batch} using model {current_model_name}...")
            try:
                # Function to run the API call, needed for ThreadPoolExecutor
                def api_call_task():
                    return current_client.chat.create_with_completion(
                        messages=messages,
                        response_model=pydantic_model,
                        generation_config={
                            "temperature": 0.0,
                            "top_p": 1,
                            "candidate_count": 1,
                            "max_output_tokens": 8000,
                        },
                        max_retries=1, # Reduced internal retries as we have our own loop
                    )

                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(api_call_task)
                    completion, raw = future.result(timeout=15) # 15-second timeout

                # --- Success ---
                result = completion.model_dump()
                print(f"Success on attempt {attempt + 1} for file {file_batch}")
                if generation:
                    # Update generation details for the successful attempt
                    generation.model = current_model_name
                    generation.end(
                        output=result,
                        usage={
                            "input": raw.usage_metadata.prompt_token_count,
                            "output": raw.usage_metadata.candidates_token_count,
                        },
                        level="DEFAULT", # Explicitly set level to DEFAULT for success
                        status_message=f"Success on attempt {attempt + 1}"
                    )
                return result, index

            except concurrent.futures.TimeoutError:
                last_status_message = f"Attempt {attempt + 1} timed out after 15s (Model: {current_model_name})"
                print(last_status_message)
                last_exception = concurrent.futures.TimeoutError(last_status_message) # Store exception type

            except Exception as e:
                last_status_message = f"Attempt {attempt + 1} failed (Model: {current_model_name}): {str(e)}, {traceback.format_exc()}"
                print(last_status_message)
                last_exception = e # Store the exception

            # Update generation span for failed attempt if it exists
            if generation:
                generation.status_message=last_status_message # Keep updating status message on failures
                generation.model = current_model_name # Ensure model name reflects the failed attempt

        # --- All attempts failed ---
        print(f"All {len(clients_to_try)} attempts failed for file {file_batch}. Last error: {last_status_message}")
        if generation:
            generation.end(
                output=None,
                status_message=last_status_message,
                level="ERROR",
            )
        return None, None

    #@trace
    def summerizer(
        self,
        classified_files: dict,
        batch_size: int = 50,  # Number of files to process in each batch
        max_workers: int = 30,  # Number of parallel workers
        GEMINI_API_KEY: str = "",
        ANTHROPIC_API_KEY: str = "",
        OPENAI_API_KEY: str = "",
        trace_id: str = ""
    ) -> str:
        #span = get_langfuse_context().get("span")
        span=None
        scores = [0]

        # Configure safety settings
        safe = SAFE

        # Configure Gemini with API key from request if provided
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
        else:
            # Use default API key from environment
            genai.configure()
        client_gemini_0 = instructor.from_gemini(
            client=genai.GenerativeModel(
                model_name=self.file_class_model_0, safety_settings=safe
            ),
            mode=instructor.Mode.GEMINI_JSON,
        )
        client_gemini_1 = instructor.from_gemini(
            client=genai.GenerativeModel(
                model_name=self.file_class_model_1, safety_settings=safe
            ),
            mode=instructor.Mode.GEMINI_JSON,
        )
        client_gemini_2 = instructor.from_gemini(
            client=genai.GenerativeModel(
                model_name=self.file_class_model_2, safety_settings=safe
            ),
            mode=instructor.Mode.GEMINI_JSON,
        )
        client_gemini_3 = instructor.from_gemini(
            client=genai.GenerativeModel(
                model_name=self.file_class_model_3, safety_settings=safe
            ),
            mode=instructor.Mode.GEMINI_JSON,
        )

        clients = {
            0: client_gemini_0,
            1: client_gemini_1,
            2: client_gemini_2,
            3: client_gemini_3,
        }

        model_names = {
            0: self.file_class_model_0,
            1: self.file_class_model_1,
            2: self.file_class_model_2,
            3: self.file_class_model_3,
        }


        # Prepare file lists for each category
        files_structure_docstring = []
        files_structure_documentation = []
        files_structure_config = []

        # Keep track of original indices to update the main dict later if needed
        # or to handle categorization after processing
        original_indices = {}

        for index, file in enumerate(classified_files["file_classifications"]):
            file_path = file["file_paths"]
            file_name = file.get("file_name", "").lower() # Handle potential missing key
            original_indices[file_path] = index # Store index by file_path

            if "code" in file["classification"].lower() and "ipynb" not in file_path and "__init__.py" not in file_path:
                files_structure_docstring.append([file_path, "docstring"])
            elif ".md" in file_path.lower():
                files_structure_documentation.append([file_path, "documentation"])
            elif ".yaml" in file_path.lower() or ".yml" in file_path.lower() or ".yml" in file_name:
                files_structure_config.append([file_path, "config"])


        # Combine all files to process
        all_files_to_process = files_structure_docstring + files_structure_documentation + files_structure_config

        # Temporary storage for results
        results_docstring = {}
        results_documentation = {}
        results_config = {}

        # Process all batches in parallel using a single ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_file = {}
            for i, (file_path, category) in enumerate(all_files_to_process):
                client_index = i % 4
                model_name = model_names[client_index]
                client = clients[client_index]
                fallback_clients = [clients[j] for j in range(4) if j != client_index]
                fallback_model_names = [model_names[j] for j in range(4) if j != client_index]
                if category == "docstring":
                    system_prompt = self.prompts_config["system_docstring"]
                    user_prompt = self.prompts_config["user_docstring"]
                    log_name = "docstring"
                elif category == "documentation":
                    system_prompt = self.prompts_config["system_documentation"]
                    user_prompt = self.prompts_config["user_documentation"]
                    log_name = "documentation"
                else: # category == "config"
                    system_prompt = self.prompts_config["system_configuration"]
                    user_prompt = self.prompts_config["user_configuration"]
                    log_name = "config"

                future = executor.submit(
                    self.process_batch,
                    file_path,
                    client,
                    model_name,
                    system_prompt,
                    user_prompt,
                    scores,
                    span,
                    file_path, # Pass file_path as identifier instead of original index
                    log_name=log_name,
                    fallback_clients=fallback_clients,
                    fallback_model_names=fallback_model_names,
                )
                future_to_file[future] = (file_path, category)

            for future in as_completed(future_to_file):
                file_path, category = future_to_file[future]
                try:
                    result, identifier = future.result() # identifier is file_path here
                    if result and identifier == file_path: # Check if result is valid and matches the file path
                        if category == "docstring":
                            results_docstring[file_path] = result
                        elif category == "documentation":
                            results_documentation[file_path] = result
                        elif category == "config":
                            results_config[file_path] = result
                except Exception as e:
                    print(f"Batch processing failed for {file_path} ({category}): {str(e)}", {traceback.format_exc()})


        # Structure the final output
        output_documentation = []
        output_documentation_md = []
        output_config = []

        processed_indices = set()

        # Populate docstring results
        for file_path, result in results_docstring.items():
            original_index = original_indices.get(file_path)
            if original_index is not None:
                file_data = classified_files["file_classifications"][original_index].copy()
                file_data["documentation"] = result
                file_data["file_id"] = len(output_documentation) # Assign new sequential ID
                output_documentation.append(file_data)
                processed_indices.add(original_index)

        # Populate documentation (.md) results
        for file_path, result in results_documentation.items():
            original_index = original_indices.get(file_path)
            if original_index is not None:
                file_data = classified_files["file_classifications"][original_index].copy()
                file_data["documentation"] = result # Add result under 'documentation' key
                file_data["file_id"] = len(output_documentation_md)
                output_documentation_md.append(file_data)
                processed_indices.add(original_index)

        # Populate config results
        for file_path, result in results_config.items():
            original_index = original_indices.get(file_path)
            if original_index is not None:
                file_data = classified_files["file_classifications"][original_index].copy()
                file_data["documentation_config"] = result # Add result under 'documentation_config' key
                file_data["file_id"] = len(output_config)
                output_config.append(file_data)
                processed_indices.add(original_index)

        # Add any remaining files that weren't processed (e.g., excluded ipynb, init.py)
        # This part might need adjustment based on desired behavior for unprocessed files.
        # Currently, they are implicitly excluded from the output lists.
        # If they need to be included in one of the lists without documentation, add logic here.


        return {
            "documentation": output_documentation,
            "documentation_md": output_documentation_md,
            "config": output_config,
        }


class ClassifierService:
    def __init__(self):
        self.model = None
        self.classifier_node = ClassifierNode()
        self.information_compressor_node = InformationCompressorNode()
    def run_pipeline(self, folder_path: str, batch_size: int = 50, max_workers: int = 10, GEMINI_API_KEY: str = "", ANTHROPIC_API_KEY: str = "", OPENAI_API_KEY: str = "", trace_id: str = ""):
        # Classifier Node
        classifier_result = self.classifier_node.llmclassifier(folder_path, batch_size, max_workers, GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, trace_id)

        # Information Compressor Node
        information_compressor_result = self.information_compressor_node.summerizer(classifier_result, batch_size, max_workers, GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, trace_id)

        return information_compressor_result