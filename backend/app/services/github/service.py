import os
import base64
from typing import  List, Optional
import httpx
from github import Github, GithubException
import logging
from sqlalchemy.ext.asyncio import AsyncSession

import stripe
from app.config import settings
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from app.db.github_data_service import GithubDataService
from app.services.github.schema import FileNode, RepoStatus, RepositoryInfo, RepositoryOwner, RepositoryStatusResponse

logger = logging.getLogger(__name__)


class GithubService:
    def __init__(self, github_token: str = None):
        self.github_token = github_token or os.environ.get("GITHUB_TOKEN")
        self.github_client = Github(self.github_token)
        self.httpx_client = httpx.AsyncClient(
            headers={"Authorization": f"token {self.github_token}"} if self.github_token else {},
            timeout=60.0,
        )
        self.github_data_service = GithubDataService()
        if settings.STRIPE_API_KEY:
            stripe.api_key = settings.STRIPE_API_KEY
        
    async def get_repository_info(self, owner: str, repo: str) -> RepositoryInfo:
        """Get basic repository information."""
        try:
            repo_obj = self.github_client.get_repo(f"{owner}/{repo}")
            return RepositoryInfo(
                id=repo_obj.id,
                name=repo_obj.name,
                full_name=repo_obj.full_name,
                description=repo_obj.description,
                default_branch=repo_obj.default_branch,
                stars=repo_obj.stargazers_count,
                forks=repo_obj.forks_count,
                created_at=repo_obj.created_at.isoformat(),
                updated_at=repo_obj.updated_at.isoformat(),
                size=repo_obj.size,
                owner=RepositoryOwner(
                    login=repo_obj.owner.login,
                    id=repo_obj.owner.id,
                    avatar_url=repo_obj.owner.avatar_url,
                )
            )
        except GithubException as e:
            logger.error(f"Error fetching repository info: {str(e)}")
            raise ValueError(f"Repository not found or access denied: {owner}/{repo}")
            
    async def get_file_tree(self, owner: str, repo: str, recursive: bool = True) -> List[FileNode]:
        """Get the file tree of a repository."""
        try:
            repo_obj = self.github_client.get_repo(f"{owner}/{repo}")
            branch = repo_obj.default_branch
            
            url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive={str(recursive).lower()}"
            response = await self.httpx_client.get(url)
            response.raise_for_status()
            
            data = response.json()
            file_nodes = []
            
            for item in data.get("tree", []):
                if item["type"] in ["blob", "tree"]:
                    file_nodes.append(
                        FileNode(
                            path=item["path"],
                            type="file" if item["type"] == "blob" else "directory",
                            size=item.get("size")
                        )
                    )
            
            return file_nodes
        except (GithubException, httpx.HTTPError) as e:
            logger.error(f"Error fetching file tree: {str(e)}")
            raise ValueError(f"Error fetching file tree for {owner}/{repo}")
    
    async def get_file_content(self, owner: str, repo: str, path: str, ref: Optional[str] = None) -> str:
        """Get the content of a file."""
        try:
            repo_obj = self.github_client.get_repo(f"{owner}/{repo}")
            if not ref:
                ref = repo_obj.default_branch
                
            url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={ref}"
            response = await self.httpx_client.get(url)
            response.raise_for_status()
            
            data = response.json()
            if data.get("encoding") == "base64" and data.get("content"):
                content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
                return content
            else:
                raise ValueError(f"Unexpected content format for file {path}")
        except (GithubException, httpx.HTTPError) as e:
            logger.error(f"Error fetching file content: {str(e)}")
            raise ValueError(f"Error fetching content for {path} in {owner}/{repo}")
    
    async def count_files(self, owner: str, repo: str) -> int:
        """Count the number of files in a repository."""
        file_tree = await self.get_file_tree(owner, repo)
        return sum(1 for node in file_tree if node.type == "file")
    
    async def close(self):
        """Close the HTTP client."""
        if self.httpx_client:
            await self.httpx_client.aclose()
    def clone_github_repo(self, folder_path: str, repo_url: str) -> Optional[str]:
        """
        Clone a GitHub repository into a specified folder or return path if already cloned.

        Args:
            folder_path (str): The path where the repository should be cloned
            repo_url (str): The GitHub repository URL (e.g., 'https://github.com/username/repo')

        Returns:
            Optional[str]: The path to the cloned repository if successful, None if failed

        Raises:
            ValueError: If the inputs are invalid
            subprocess.CalledProcessError: If the git clone operation fails
        """
        # Validate inputs
        if not folder_path or not repo_url:
            raise ValueError("Both folder_path and repo_url must be provided")

        # Parse the repository URL to get the repository name
        parsed_url = urlparse(repo_url.rstrip("/"))
        if not parsed_url.path:
            raise ValueError("Invalid GitHub repository URL")

        # Extract repository name from the URL path
        # Handle both 'github.com/owner/repo' and 'github.com/owner/repo.git'
        path_parts = parsed_url.path.strip("/").split("/")
        if len(path_parts) != 2:
            raise ValueError("Invalid GitHub repository URL format")

        repo_name = path_parts[1].replace(".git", "")

        # Create the target directory if it doesn't exist
        folder_path = Path(folder_path).resolve()
        folder_path.mkdir(parents=True, exist_ok=True)

        # Generate the full path where the repository will be cloned
        repo_path = folder_path / repo_name

        # If repository already exists and has .git folder, return its path
        logger.info(f"Repository path: {repo_path}")
        if repo_path.exists() or (repo_path / ".git").exists():
            return str(repo_path)

        try:
            # Check if git is installed
            subprocess.run(["git", "--version"], check=True, capture_output=True)

            # Construct the git URL
            git_url = f"https://github.com/{path_parts[0]}/{path_parts[1]}.git"

            # Clone the repository
            subprocess.run(
                ["git", "clone", git_url, str(repo_path)],
                check=True,
                capture_output=True,
                text=True,
            )

            # Verify the repository was cloned successfully
            if not (repo_path / ".git").exists():
                raise subprocess.CalledProcessError(1, "git clone")

            return str(repo_path)

        except subprocess.CalledProcessError as e:
            logger.error(f"Error cloning repository: {e}")
            if e.stderr:
                logger.error(f"Git error message: {e.stderr}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return None

    async def get_repository_status(
        self, owner: str, repo: str, session: AsyncSession
    ) -> RepositoryStatusResponse:
        """
        Get the status of a repository.
        """
        repository_status = await self.github_data_service.get_repository_status(owner=owner, repo=repo, session=session)
        if repository_status.status != RepoStatus.NOT_INDEXED:
            return repository_status

        try:
            file_count = await self.count_files(owner, repo)
            return RepositoryStatusResponse(
                status=RepoStatus.NOT_INDEXED,
                file_count=file_count,
                message="Repository not indexed yet",
            )
        except ValueError as e:
            logger.error(f"Error getting file count: {str(e)}")
            raise ValueError(f"Repository not found or access denied: {owner}/{repo}")
