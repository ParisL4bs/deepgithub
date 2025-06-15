import json
import os
import sys
from app.services.llm_service.service import TemplateManager
from app.services.indexer.schema import (
    create_file_classification,
    generate_code_structure_model_consize,
    DocumentCompression,
    YamlBrief
)

from app.services.indexer.utils import create_cache, list_all_files, SAFE
import instructor
import dotenv
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
import concurrent.futures
import google.generativeai as genai
import logging
from app.services.monitor.langfuse import get_langfuse_context,trace,generate_trace_id
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.services.chat.service import ChatService
from app.services.github.service import GithubService
from app.db.github_data_service import GithubDataService
from app.models.models import RepoStatus
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(project_root)



logger = logging.getLogger(__name__)

dotenv.load_dotenv()


class ClassifierConfig:
    def __init__(self):
        current_dir = Path(__file__).parent
        # Initialize TemplateManager with the correct search directory
        self.template_manager = TemplateManager(default_search_dir=current_dir)
        self.prompts_config = {
            "system_classification": self.template_manager.render_template("prompts/system_prompt_classification.jinja2"),
            "user_classification": self.template_manager.render_template("prompts/user_prompt_classification.jinja2"),
            "system_docstring": self.template_manager.render_template("prompts/prompt_docstrings/system_prompt_classification.jinja2"),
            "user_docstring": self.template_manager.render_template("prompts/prompt_docstrings/user_prompt_classification.jinja2"),
            "system_configuration": self.template_manager.render_template("prompts/prompt_configurations/system_prompt_configuration.jinja2"),
            "user_configuration": self.template_manager.render_template("prompts/prompt_configurations/user_prompt_configuration.jinja2"),
            "system_documentation": self.template_manager.render_template("prompts/prompt_documentations/system_prompt_documentation.jinja2"),
            "user_documentation": self.template_manager.render_template("prompts/prompt_documentations/user_prompt_documentation.jinja2"),
        }
        self.file_class_model_0 = os.getenv("FILE_CLASSICATION_MODEL_0")
        self.file_class_model_1 = os.getenv("FILE_CLASSICATION_MODEL_1")
        self.file_class_model_2 = os.getenv("FILE_CLASSICATION_MODEL_2")
        self.file_class_model_3 = os.getenv("FILE_CLASSICATION_MODEL_3")
        


class ClassifierNode(ClassifierConfig):
    def __init__(self):
        super().__init__()

    def process_batch(
        self,
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

    @trace
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
        span = get_langfuse_context().get("span")

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
        self,
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
    @trace
    def summarizer(
        self,
        classified_files: dict,
        batch_size: int = 50,  # Number of files to process in each batch
        max_workers: int = 30,  # Number of parallel workers
        GEMINI_API_KEY: str = "",
        ANTHROPIC_API_KEY: str = "",
        OPENAI_API_KEY: str = "",
        trace_id: str = ""
    ) -> str:
        span = get_langfuse_context().get("span")
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


class IndexerService:
    def __init__(self):
        self.model = None
        self.classifier_node = ClassifierNode()
        self.information_compressor_node = InformationCompressorNode()
        self.trace_id = generate_trace_id()
        self.github_service = GithubService()
        self.github_data_service = GithubDataService()
        
        # Create indexed_data folder for single JSON files
        if not os.path.exists("indexed_data"):
            os.makedirs("indexed_data")
    def run_pipeline(self, folder_path: str, batch_size: int = 50, max_workers: int = 10, GEMINI_API_KEY: str = "", ANTHROPIC_API_KEY: str = "", OPENAI_API_KEY: str = ""):
        # Classifier Node
        classifier_result = self.classifier_node.llmclassifier(
            folder_path, 
            batch_size, 
            max_workers, 
            GEMINI_API_KEY, 
            ANTHROPIC_API_KEY, 
            OPENAI_API_KEY, 
            trace_id=self.trace_id 
        )
        # Information Compressor Node
        information_compressor_result = self.information_compressor_node.summarizer(
            classifier_result, 
            batch_size, 
            max_workers, 
            GEMINI_API_KEY, 
            ANTHROPIC_API_KEY, 
            OPENAI_API_KEY, 
            trace_id=self.trace_id  # Pass trace_id explicitly
        )
        return information_compressor_result
    async def insert_index_and_cache(self, link: str, gemini_api_key=None, session: AsyncSession = None)->str:
        
        if gemini_api_key is None:
            gemini_api_key = os.getenv("GEMINI_API_KEY")
    
        display_name = link.split("/")[-1]
        indexed_data_path = f"indexed_data/{display_name}.json"
        repo_path = self.github_service.clone_github_repo("repository_folder", link)

        system_prompt = """
    # Context
    You are an expert Software developer with a deep understanding of the software development lifecycle, including requirements gathering, design, implementation, testing, and deployment.
    Your task is to answer any question related to the documentation of the python repository repository_name that you have in your context.


    """.replace(
            "repository_name", display_name
        )

        # Check if single JSON file already exists
        if os.path.exists(indexed_data_path):
            # Load existing single JSON data
            with open(indexed_data_path, "r") as f:
                combined_json = json.load(f)
            
            # Extract individual components for backward compatibility with chat service
            documentation_json = {"documentation": combined_json.get("documentation", [])}
            documentation_md_json = {"documentation_md": combined_json.get("documentation_md", [])}
            config_json = {"config": combined_json.get("config", [])}
            
        else:
            # Run indexing pipeline
            logger.info(f"Calling indexer service for {repo_path} with GEMINI_API_KEY: {gemini_api_key[0:5]}")
            try:
                response = self.run_pipeline(folder_path=repo_path, GEMINI_API_KEY=gemini_api_key)
            except Exception as e:
                raise Exception(f"Failed to get documentation from the server: {e},{traceback.format_exc()}")

            # Create individual JSON structures for compatibility
            documentation_json = {"documentation": response["documentation"]}
            documentation_md_json = {"documentation_md": response["documentation_md"]}
            config_json = {"config": response["config"]}

            # Create combined JSON structure
            combined_json = {
                "documentation": response["documentation"],
                "documentation_md": response["documentation_md"],
                "config": response["config"],
                "summary": {
                    "total_files": len(response["documentation"]) + len(response["documentation_md"]) + len(response["config"]),
                    "indexed_at": datetime.utcnow().isoformat(),
                    "documentation_files": len(response["documentation"]),
                    "markdown_files": len(response["documentation_md"]),
                    "config_files": len(response["config"])
                }
            }

            logger.info("Generated new indexed data")

            # Save the single combined JSON file
            with open(indexed_data_path, "w") as f:
                json.dump(combined_json, f, indent=4)

        # Save to database if session is provided
        if session:
            try:
                # Extract owner and repo from link
                parts = link.rstrip("/").split("/")
                owner = parts[-2]
                repo = parts[-1]
                
                # Get repository info from GitHub
                repo_info = await self.github_service.get_repository_info(owner, repo)
                repo_info_dict = {
                    "id": repo_info.id,
                    "description": repo_info.description,
                    "default_branch": repo_info.default_branch,
                    "stars": repo_info.stars,
                    "forks": repo_info.forks,
                    "size": repo_info.size,
                }
                
                # Create or update repository with INDEXED status
                repository = await self.github_data_service.create_or_update_repository(
                    owner=owner,
                    repo=repo,
                    repo_info=repo_info_dict,
                    status=RepoStatus.INDEXED,
                    session=session
                )
                
                # Save indexed data to database using the simplified approach
                await self.github_data_service.save_indexed_data(
                    repository=repository,
                    documentation_data=documentation_json,
                    documentation_md_data=documentation_md_json,
                    config_data=config_json,
                    session=session
                )
                
                logger.info(f"Successfully saved repository {owner}/{repo} to database")
                
            except Exception as e:
                logger.error(f"Error saving to database: {str(e)}")
                # Don't raise the exception, just log it so the cache creation can continue

        documentation_str = str(documentation_json)
        cache_name = create_cache(display_name, documentation_str, system_prompt, gemini_api_key)

        return cache_name

    async def save_indexed_data_to_db(
        self,
        owner: str,
        repo: str,
        session: AsyncSession,
        gemini_api_key: str = None
    ) -> str:
        """
        Save indexed repository data to the database.
        This method handles the complete flow of indexing and saving to database.
        """
        try:
            # Set repository status to PENDING
            repo_info = await self.github_service.get_repository_info(owner, repo)
            repo_info_dict = {
                "id": repo_info.id,
                "description": repo_info.description,
                "default_branch": repo_info.default_branch,
                "stars": repo_info.stars,
                "forks": repo_info.forks,
                "size": repo_info.size,
            }
            
            # Create or update repository with PENDING status
            repository = await self.github_data_service.create_or_update_repository(
                owner=owner,
                repo=repo,
                repo_info=repo_info_dict,
                status=RepoStatus.PENDING,
                session=session
            )
            
            # Run indexing process
            link = f"https://github.com/{owner}/{repo}"
            cache_name = await self.insert_index_and_cache(link, gemini_api_key, session)
            
            logger.info(f"Successfully indexed and saved repository {owner}/{repo} to database")
            return cache_name
            
        except Exception as e:
            # Set repository status to FAILED if something goes wrong
            try:
                await self.github_data_service.create_or_update_repository(
                    owner=owner,
                    repo=repo,
                    repo_info=repo_info_dict,
                    status=RepoStatus.FAILED,
                    session=session
                )
            except:
                pass  # Don't fail if we can't update status
            
            logger.error(f"Error indexing repository {owner}/{repo}: {str(e)}")
            raise

# test
if __name__ == "__main__":
    import asyncio
    
    async def main():
        service = IndexerService()
        chat = ChatService()
        cache_name = await service.insert_index_and_cache("https://github.com/julien-blanchon/arxflix", os.getenv("GEMINI_API_KEY"))

        repository_name_test = "arxflix"
        user_problem_test = "The documentation of this repo is not very good. I need you to generate a complete precide documentation of this repo. Really detailled."

        # Load from single JSON file
        indexed_data_path = f"indexed_data/{repository_name_test}.json"
        with open(indexed_data_path, "r") as f:
            combined_data = json.load(f)

        # Extract components for chat service
        documentation_input_test = {"documentation": combined_data.get("documentation", [])}
        documentation_md_input_test = {"documentation_md": combined_data.get("documentation_md", [])}
        config_input_test = {"config": combined_data.get("config", [])}

        answer = chat.run_pipeline(
                repository_name=repository_name_test,
                cache_id=cache_name,
                documentation=documentation_input_test,
                user_problem=user_problem_test,
                documentation_md=documentation_md_input_test,
                config_input=config_input_test,
                GEMINI_API_KEY=os.getenv("GEMINI_API_KEY"),
                is_documentation_mode=True
            )
        
        print(answer)
    
    asyncio.run(main())
    