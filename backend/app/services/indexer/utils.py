import os
from typing import List, Dict

#TODO PUT THIS IN THE MODEL SERVICE
import dotenv
import google.generativeai as genai
from google.generativeai import caching
import google.api_core.exceptions as exceptions
import datetime
import time
import logging
import sys

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(project_root)

dotenv.load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


CONTEXT_CACHING_RETRIVER = os.getenv("CONTEXT_CACHING_RETRIVER")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Default configuration with environment variable
genai.configure(api_key=GEMINI_API_KEY)




SAFE = [
            {"category": "HARM_CATEGORY_DANGEROUS", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]
# List of patterns to ignore
ignore_list = [
    "pycache",
    ".gitignore",
    ".md",
    ".ipynb",
    "venv",
    ".git",
    ".idea",
    "node_modules",
    "build",
    "dist",
    "target",
    ".vscode",
    ".DS_Store",
    ".mypy_cache",
    ".pytest_cache",
    "__init__.py",  # Corrected from "init.py"
    ".txt",
    ".log",
    ".aux",
    ".bbl",
    ".blg",
    ".fdb_latexmk",
    ".fls",
    ".lof",
    ".lot",
    ".out",
    ".toc",
    ".synctex.gz",
    ".egg-info",
    ".coverage",
    ".pytest_cache",
    ".ropeproject",
    ".ipynb_checkpoints",
    ".env",
    ".venv",
    "npm-debug.log",
    "yarn-error.log",
    ".pylintrc",
    ".cache",
    ".settings",
    ".classpath",
    ".project",
    ".metadata",
    "tags",
    "release",
    "debug",
    "bin",
    "obj",
    ".swp",  # Vim swap files
    "~",  # Emacs backup files
    ".swo",  # Vim undo files
    ".swn",  # Vim swap files (alternative)
    ".bak",  # Backup files
    ".tmp",  # Temporary files
    ".orig",  # Original files (often backups)
    ".rej",  # Patch rejection files
    ".lock",  # Lock files (various uses)
    ".log",  # Log files
    ".pdf",  # PDF documents
    ".doc",  # Word documents
    ".docx",  # Word documents (newer format)
    ".xls",  # Excel spreadsheets
    ".xlsx",  # Excel spreadsheets (newer format)
    ".ppt",  # PowerPoint presentations
    ".pptx",  # PowerPoint presentations (newer format)
    ".zip",  # Compressed archives
    ".tar",  # Tape archives
    ".gz",  # Gzip compressed files
    ".rar",  # RAR archives
    ".7z",  # 7-Zip archives
    ".dmg",  # macOS disk images
    ".iso",  # Disk image files
    ".exe",  # Executable files (Windows)
    ".dll",  # Dynamic link libraries (Windows)
    ".app",  # macOS application bundles
    ".pkg",  # macOS installer packages
    ".db",  # Database files (various types)
    ".sqlite",  # SQLite database files
    ".csv",  # Comma-separated value files
    ".json",  # JSON data files
    ".xml",  # XML data files
    ".yaml",  # YAML data files
    ".yml",  # YAML data files (alternative extension)
    ".cfg",  # Configuration files
    ".conf",  # Configuration files (alternative extension)
    ".ini",  # Initialization files
    ".pem",  # Privacy-enhanced mail files (often keys)
    ".crt",  # Certificate files
    ".key",  # Key files
    ".pfx",  # Personal Information Exchange files
    ".jks",  # Java KeyStore files
    ".dat",  # Data files (generic)
    ".bin",  # Binary files (generic)
    ".dump",  # Database or memory dumps
    ".sql",  # SQL scripts
    ".bak",  # Backup files (various types)
    ".old",  # Old versions of files
    ".draft",  # Draft documents
    ".media",  # Media files (generic)
    ".assets",  # Assets files (generic)
    ".resources",  # Resource files (generic)
    ".snap",  # Snapshots (various uses)
    ".image",  # Image files (generic)
    ".backup",  # Backup files (explicit)
    ".temp",  # Temporary files (alternative)
    ".download",  # Downloaded files (incomplete)
    ".part",  # Partially downloaded files
    ".crdownload",  # Chrome download files (incomplete)
    ".unconfirmed",  # Unconfirmed download files
    ".incomplete",  # Incomplete files
    ".journal",  # Journal files (various uses)
    ".fuse_hidden",  # Hidden files related to FUSE mounts
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".tiff",
    ".svg",
    ".mp3",
    ".wav",
    ".srt",
    ".flac",
    ".aac",
    ".ogg",
    ".wma",
    ".mp4",
    ".avi",
    ".mkv",
    ".mov",
    ".wmv",
    ".flv",
    ".m4v",
    ".webm",
    ".m2ts",
    ".mts",
    ".3gp",
    ".m4a",
    ".aif",
    ".aiff",
    ".raw",
    ".psd",
    ".ai",
    ".eps",
    ".indd",
    ".blend",
    ".max",
    ".ma",
    ".mb",
    ".3ds",
    ".obj",
    ".fbx",
    ".dae",
    ".stl",
    ".wrl",
    ".x3d",
    ".ttf",
]


def has_file_extension(filename):
    """
    Check if a file has an extension.

    Args:
        filename (str): Name of the file to check

    Returns:
        bool: True if the file has an extension, False otherwise
    """
    return "." in filename and filename.rsplit(".", 1)[1].strip() != ""


def should_process_file(filepath):
    """
    Determine if a file should be processed based on ignore list and extension presence.

    Args:
        filepath (str): Full path of the file to check

    Returns:
        bool: True if the file should be processed, False otherwise
    """
    filename = os.path.basename(filepath)

    # Check if file matches any pattern in ignore list
    if any(forbidden in filepath for forbidden in ignore_list):
        return False

    # Check if file has an extension
    if not has_file_extension(filename):
        return False

    return True


def list_all_files(folder_path: str, include_md: bool) -> Dict[str, List[str]]:
    """
    Lists all valid files in the given folder and its subdirectories.

    Args:
        folder_path (str): Path to the folder to be analyzed.

    Returns:
        dict: A dictionary containing two lists:
              - 'all_files_with_path': Full paths of all valid files
              - 'all_files_no_path': A list of dictionaries, each with keys
                                    'file_name' and 'file_id'

    Raises:
        FileNotFoundError: If the folder_path doesn't exist
    """
    if not os.path.exists(folder_path):
        raise FileNotFoundError(f"The path {folder_path} does not exist")

    # Initialize lists to store file paths and names
    all_files_with_path = []
    all_files_no_path = []

    # Remove .md from ignore list if include_md is True
    if include_md:
        if ".md" in ignore_list:
            ignore_list.remove(".md")
        if ".yaml" in ignore_list:
            ignore_list.remove(".yaml")
        if ".yml" in ignore_list:
            ignore_list.remove(".yml")

    try:
        for root, _, files in os.walk(folder_path):
            for file in files:
                full_path = os.path.join(root, file)

                if should_process_file(full_path) and "env_arxflix" not in full_path:
                    all_files_with_path.append(full_path)
                    all_files_no_path.append(
                        {"file_name": file, "file_id": len(all_files_with_path) - 1}
                    )

        return {
            "all_files_with_path": all_files_with_path,
            "all_files_no_path": all_files_no_path,
        }

    except Exception as e:
        raise Exception(f"Error while processing files: {str(e)}")




# Function to configure API with a specific key
def configure_gemini_api(api_key=None):
    """Configure Gemini API with a specific key or use the environment variable"""
    if api_key:
        genai.configure(api_key=api_key)
    else:
        genai.configure(api_key=GEMINI_API_KEY)

def create_cache(display_name: str, documentation: str, system_prompt: str, gemini_api_key=None):
    # Configure Gemini API with the provided key or use the default
    configure_gemini_api(gemini_api_key)
    
    # Delete old caches with the same display name
    max_retries = 3
    retry_delay = 2 # seconds
    cache_list = None
    for attempt in range(max_retries):
        try:
            cache_list = caching.CachedContent.list()
            logger.info(f"Successfully listed caches on attempt {attempt + 1}")
            break # Success, exit loop
        except exceptions.ServiceUnavailable as e:
            logger.warning(f"Attempt {attempt + 1}/{max_retries} failed to list caches: {e}. Retrying in {retry_delay}s...")
            if attempt + 1 == max_retries:
                logger.error("Max retries reached for listing caches. Raising error.")
                raise # Re-raise the last exception if max retries reached
            time.sleep(retry_delay)
        except Exception as e: # Catch other potential exceptions during list
            logger.error(f"Unexpected error listing caches on attempt {attempt + 1}: {e}")
            raise # Re-raise unexpected errors immediately

    if cache_list is not None:
        logger.info(f"Result of caching.CachedContent.list(): {cache_list}")
        logger.info(f"Type of cache_list: {type(cache_list)}")
        for cache in cache_list:
            if cache is not None:
                if cache.display_name == display_name:
                    return cache.name
            else:
                logger.warning("Encountered None value while iterating through cache_list")
    cache = caching.CachedContent.create(
        model=CONTEXT_CACHING_RETRIVER,
        display_name=display_name,  # used to identify the cache
        contents=documentation,
        system_instruction=system_prompt,
        ttl=datetime.timedelta(minutes=30),
    )
    return cache.name


def delete_cache(display_name: str):
    # Delete old display name
    cache_list = caching.CachedContent.list()
    for cache in cache_list:
        if cache.display_name == display_name:
            cache.delete()
            return None

