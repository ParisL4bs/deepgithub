from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import stripe

import logging

from app.database import get_async_session
from app.config import settings
from app.models.models import Repository, RepoStatus
from app.services.github.schema import (
    RepositoryInfo,
    RepositoryStatusResponse,
    CheckoutResponse,
    DocsResponse,
    FileDescription,
)
from app.services.indexer.service import IndexerService
from app.services.github.service import GithubService


router = APIRouter(prefix="/repos", tags=["repository"])
logger = logging.getLogger(__name__)

# Initialize Stripe
if settings.STRIPE_API_KEY:
    stripe.api_key = settings.STRIPE_API_KEY

# Initialize GitHub service
github_service = GithubService()
indexer_service = IndexerService()

@router.get("/{owner}/{repo}/status", response_model=RepositoryStatusResponse)
async def get_repository_status(
    owner: str, repo: str, session: AsyncSession = Depends(get_async_session)
):
    """
    Check the indexing status of a repository.
    """
    try:
        return await github_service.get_repository_status(owner, repo, session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{owner}/{repo}/index", response_model=CheckoutResponse)
async def index_repository(
    owner: str,
    repo: str,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Start the indexing process for a repository.
    Creates a Stripe checkout session for payment and saves results to database.
    """
    try:
        # Use the new method that saves to database
        cache_name = await indexer_service.save_indexed_data_to_db(
            owner=owner,
            repo=repo,
            session=session
        )
        return CheckoutResponse(cache_name=cache_name)
    except ValueError as e: 
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error indexing repository {owner}/{repo}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during indexing")


@router.get("/{owner}/{repo}/docs", response_model=DocsResponse)
async def get_repository_docs(
    owner: str, repo: str, session: AsyncSession = Depends(get_async_session)
):
    """
    Get documentation for a repository.
    """
    # Check if repository exists and is indexed
    result = await session.execute(
        select(Repository).where(Repository.full_name == f"{owner}/{repo}")
    )
    repository = result.scalars().first()

    if not repository:
        raise HTTPException(status_code=404, detail="Repository not found")

    if repository.status != RepoStatus.INDEXED:
        raise HTTPException(
            status_code=400,
            detail=f"Repository is not indexed. Current status: {repository.status.value}",
        )

    # Get indexed data from the single JSON field
    indexed_data = repository.indexed_data or {}
    
    # Extract file information from the indexed data
    file_descriptions = []
    
    # Process documentation files (code files)
    documentation_files = indexed_data.get("documentation", [])
    for file_data in documentation_files:
        file_descriptions.append(
            FileDescription(
                path=file_data.get("file_paths", ""),
                description=file_data.get("documentation", {}).get("global_code_description", "")[:200],
                type="code",
                size=None,
                language=_get_language_from_path(file_data.get("file_paths", "")),
            )
        )
    
    # Process markdown files
    documentation_md_files = indexed_data.get("documentation_md", [])
    for file_data in documentation_md_files:
        file_descriptions.append(
            FileDescription(
                path=file_data.get("file_paths", ""),
                description=_extract_markdown_description(file_data.get("documentation", {}))[:200],
                type="documentation",
                size=None,
                language="markdown",
            )
        )
    
    # Process config files
    config_files = indexed_data.get("config", [])
    for file_data in config_files:
        file_descriptions.append(
            FileDescription(
                path=file_data.get("file_paths", ""),
                description=file_data.get("documentation_config", {}).get("file_purpose", "")[:200],
                type="config",
                size=None,
                language=_get_language_from_path(file_data.get("file_paths", "")),
            )
        )

    # Get repository info
    repo_info = await github_service.get_repository_info(owner, repo)

    return DocsResponse(
        repository=repo_info,
        files=file_descriptions,
    )


def _get_language_from_path(file_path: str) -> str:
    """Determine programming language from file extension."""
    if not file_path:
        return "unknown"
    
    extension = file_path.split(".")[-1].lower()
    language_map = {
        "py": "python",
        "js": "javascript",
        "ts": "typescript",
        "jsx": "javascript",
        "tsx": "typescript",
        "java": "java",
        "cpp": "cpp",
        "c": "c",
        "cs": "csharp",
        "php": "php",
        "rb": "ruby",
        "go": "go",
        "rs": "rust",
        "swift": "swift",
        "kt": "kotlin",
        "scala": "scala",
        "r": "r",
        "sql": "sql",
        "sh": "shell",
        "bash": "shell",
        "zsh": "shell",
        "fish": "shell",
        "ps1": "powershell",
        "html": "html",
        "css": "css",
        "scss": "scss",
        "sass": "sass",
        "less": "less",
        "xml": "xml",
        "json": "json",
        "yaml": "yaml",
        "yml": "yaml",
        "toml": "toml",
        "ini": "ini",
        "cfg": "config",
        "conf": "config",
        "md": "markdown",
        "rst": "restructuredtext",
        "tex": "latex",
    }
    
    return language_map.get(extension, "unknown")


def _extract_markdown_description(documentation: dict) -> str:
    """Extract description from markdown documentation."""
    if not documentation:
        return ""
    
    # Try to get overview summary first
    overview = documentation.get("overview_summary", {})
    if overview and isinstance(overview, dict):
        summary = overview.get("summary", "")
        if summary:
            return summary
    
    # Fall back to first section summary
    sections = documentation.get("sections", [])
    if sections and len(sections) > 0:
        first_section = sections[0]
        if isinstance(first_section, dict):
            compressed_chunks = first_section.get("compressed_chunks", [])
            if compressed_chunks and len(compressed_chunks) > 0:
                first_chunk = compressed_chunks[0]
                if isinstance(first_chunk, dict):
                    return first_chunk.get("summary", "")
    
    return ""


@router.get("/{owner}/{repo}/info", response_model=RepositoryInfo)
async def get_github_repo_info(owner: str, repo: str):
    """
    Get basic information about a GitHub repository.
    """
    repo_info = await github_service.get_repository_info(owner, repo)
    return repo_info
