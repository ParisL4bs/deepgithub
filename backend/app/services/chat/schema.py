from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Any


def get_necesary_files(documentation: dict) -> BaseModel:
    class File(BaseModel):
        file_name: str = Field(
            description="The name of the file as it appears as file_name in the documentation",
            examples=["main.py", "utils.py"],
        )
        file_id: str = Field(
            description="The file id of the file as it appears as file_id in the documentation",
            examples=["241", "54"],
        )

    class ChosenFiles(BaseModel):
        justification: str = Field(
            description="The reasoning behind choosing the files, explaining why they are relevant",
        )

        files_list: List[File] = Field(
            description="The list of files that the user needs to look into to achieve their goal",
            examples=[
                [
                    {"file_name": "main.py", "file_id": "241"},
                    {"file_name": "utils.py", "file_id": "54"},
                ]
            ],
        )

        @model_validator(mode="after")
        def validate_files_list(cls, values):
            """
            checking that filename and file_id are in documentation["documentation"] file_list,
            Accumulating all errors to raise them only once
            """
            files_list = values.files_list
            errors = []
            documentation_files = documentation.get("documentation")
            for file in files_list:
                found = False
                for doc_file in documentation_files:
                    if file.file_name == doc_file.get(
                        "file_name"
                    ) and file.file_id == str(doc_file.get("file_id")):
                        found = True
                        break
                if not found:
                    errors.append(
                        f"File {file.file_name} with id {file.file_id} not found in documentation. "
                    )

            # make sure the justification is present to
            if not values.justification:
                errors.append("Justification is required")

            if errors:
                raise ValueError(
                    "\n".join(errors) + "correct all this errors. Respect the rules."
                )
            return values

    return ChosenFiles


class GoalRewriteModel(BaseModel):
    justification: str = Field(..., description="Explanation of the rewriting process")
    goal_rewrite: str = Field(
        ..., description="The rewritten sentence in goal-based format"
    )

def get_markdown_documentation(code_documentation_json: List[Dict[str, Any]], readme_doc_json: List[Dict[str, Any]], config_doc_json: List[Dict[str, Any]]) -> BaseModel:
    """
    Generates a structured Markdown documentation model based on analyzed code, README, and configuration files.

    Args:
        code_documentation_json: A list of dictionaries, each representing an analyzed code file
                                 (expected keys: 'file_id', 'file_name', ...).
        readme_doc_json: A list of dictionaries, each representing an analyzed README file or section
                         (expected keys: 'file_id', 'file_name', ...).
        config_doc_json: A list of dictionaries, each representing an analyzed configuration file
                         (expected keys: 'file_id', 'file_name', ...).

    Returns:
        An instance of the markdown_documentation Pydantic model, representing the structured
        documentation ready for Markdown rendering.
    """

    # Create this at function level before defining classes
    original_files = {
        (file_info["file_name"], file_info["file_id"])
        for file_list in [code_documentation_json, readme_doc_json, config_doc_json]
        if isinstance(file_list, list)
        for file_info in file_list
        if isinstance(file_info, dict) and "file_name" in file_info and "file_id" in file_info
    }

    class file_source(BaseModel):
        """
        Identifies a specific source file (e.g., code file, README section, config file)
        from the input data that contributed information to a part of the generated documentation.
        This provides traceability from the generated content back to its origin.
        """
        file_id: int = Field(
            description="A unique identifier for the source file, derived directly from the corresponding "
                        "entry in the input documentation JSONs (code_documentation_json, readme_doc_json, "
                        "config_doc_json). Ensures precise tracking and linkage."
        )
        file_name: str = Field(
            description="The original name of the source file (e.g., 'main.py', 'README.md', 'config.yaml'), "
                        "as provided in the input documentation JSONs. Used for human-readable reference "
                        "and context."
        )

    class markdown_paragraph(BaseModel):
        """
        Represents a distinct, self-contained block of content within a documentation section.
        This block typically corresponds to a specific topic, feature explanation, code example,
        or configuration detail derived and synthesized from one or more source files.
        It forms the granular building block of the documentation structure.
        """
        subsection_title: str = Field(
            description="The specific title or heading for this particular content block or paragraph. "
                        "Provides structure within a larger section (defined in `sections_list`). "
                        "Should concisely describe the content that follows."
        )
        content: str = Field(
            description="The generated Markdown-formatted text content for this specific paragraph or block. "
                        "This is the core informational unit, potentially including text, code snippets, lists, etc."
        )
        sources: List[file_source] = Field(
            description="A list of `file_source` objects indicating the specific original file(s) "
                        "from which the information in the 'content' field was derived or synthesized. "
                        "This list is crucial for traceability and is validated to ensure all listed "
                        "sources correspond to actual files present in the initial input JSONs."
        )

        @model_validator(mode="after")
        def check_sources_are_in_file(cls, values):
            """
            Validates that all file sources listed actually exist in the original input JSON data.
            """
            if not hasattr(values, 'sources'):
                return values
                
            # Access original_files from parent scope - now explicitly prepared beforehand
            classified_files = {
                (source.file_name, source.file_id)
                for source in values.sources
            }
            
            # Find hallucinated files
            hallucinated_files = classified_files - original_files
            
            # Prepare error message if needed
            error_messages = []

            if hallucinated_files:
                hallucinated_files_str = ", ".join(
                    f"(name: '{name}', id: {id})" for name, id in hallucinated_files
                )
                error_messages.append(
                    f"Invalid source(s) listed in 'sources' field: {hallucinated_files_str}. "
                    f"These files were not found in the original input documentation data "
                    f"(code_documentation_json, readme_doc_json, config_doc_json)."
                    f" Ensure all sources refer to valid input files."
                )

            if error_messages:
                raise ValueError(" ".join(error_messages))

            return values

    class sections_list(BaseModel):
        """
        Defines a major logical section within the generated Markdown documentation.
        Examples include 'Installation', 'Usage', 'API Reference', 'Configuration Guide'.
        It serves to group related content blocks (`markdown_paragraph`) under a common heading.
        """
        section_title: str = Field(
            description="The main title or heading for this major section of the documentation. "
                        "This will typically be rendered as a top-level heading (e.g., H1 or H2) in the final Markdown."
        )
        section_overview: str = Field(
            description="A concise overview of the section, providing a high-level summary of the content within."
        )
        subsections: List[markdown_paragraph] = Field(
            description="An ordered list of `markdown_paragraph` objects that constitute the content "
                        "within this major section. Each item in the list represents a specific paragraph, "
                        "content block, or sub-topic with its own title, generated content, and source attribution."
        )

    class markdown_documentation(BaseModel):
        """
        The root model representing the entire, structured, generated Markdown documentation.
        It organizes the complete documentation output into a logical hierarchy of sections
        and content blocks, synthesized from the analysis of the provided code, README, and
        configuration documentation sources. This model serves as the final output format
        before rendering to a Markdown file.
        """
        documentation: List[sections_list] = Field(
            description="An ordered list of `sections_list` objects, representing all the major sections "
                        "(e.g., 'Introduction', 'Installation', 'API') that compose the final generated documentation. "
                        "The order in this list dictates the top-level structure of the output document."
        )


    # The function returns the *class* itself, which acts as a factory or type definition.
    # The caller would then instantiate this class with data.
    return markdown_documentation
