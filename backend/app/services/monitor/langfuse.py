import functools
import json
import os
import threading
import traceback
from contextvars import ContextVar
from typing import Any, Callable, Dict, Optional
import uuid
from langfuse import Langfuse

import dotenv
dotenv.load_dotenv()
LANG_DISABLE_TRACING = os.getenv("LANG_DISABLE_TRACING", "false").lower() == "true"
# Context variables for managing tracing context
langfuse_span: ContextVar[Optional[Any]] = ContextVar("langfuse_span", default=None)
langfuse_metadata: ContextVar[Optional[Dict]] = ContextVar(
    "langfuse_metadata", default=None
)

# Module-level singleton pattern with thread safety
_langfuse_client: Optional[Langfuse] = None
_client_lock = threading.Lock()


def get_langfuse_client() -> Langfuse:
    """Initialize and return the Langfuse client with thread safety."""
    global _langfuse_client
    if _langfuse_client is not None:
        return _langfuse_client

    with _client_lock:
        # Double-checked locking pattern
        if _langfuse_client is None:
            _langfuse_client = Langfuse()
            _langfuse_client.auth_check()

    return _langfuse_client


def get_langfuse_context() -> Dict[str, Any]:
    """Get the current Langfuse context including span and metadata."""
    return {
        "span": langfuse_span.get(),
        "metadata": langfuse_metadata.get(),
    }



def generate_trace_id() -> str:
    """Generate a random unique trace ID suitable for use with Langfuse."""
    return str(uuid.uuid4())

def update_langfuse_context(
    span: Optional[Any] = None, metadata: Optional[Dict] = None
) -> None:
    """Update the current Langfuse context with new values."""
    if span is not None:
        langfuse_span.set(span)
    if metadata is not None:
        langfuse_metadata.set(metadata)


def is_json_serializable(obj: Any) -> bool:
    """Check if an object is JSON serializable."""
    try:
        json.dumps(obj)
        return True
    except (TypeError, ValueError, OverflowError):
        return False


def _filter_serializable_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Filter out non-JSON-serializable inputs."""
    return {k: v for k, v in inputs.items() if is_json_serializable(v)}





def _create_trace_and_span(
    langfuse: Langfuse, inputs: Dict[str, Any], name: str, trace_id: str
) -> Any:
    """Create a new trace and span with proper metadata."""
    trace = langfuse.trace(id=trace_id, name= "classifier")    #take the name from func argiment of env var.
    return trace.span(name=name, input=inputs)


def trace(func: Callable) -> Callable:
    """Decorator to trace function execution with Langfuse observability."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        if LANG_DISABLE_TRACING:
            return func(*args, **kwargs)
        langfuse = get_langfuse_client()

        func_inputs = _filter_serializable_inputs(kwargs)

        # Create new span and trace
        span = _create_trace_and_span(langfuse, func_inputs, name=func.__name__, trace_id=kwargs["trace_id"])
        update_langfuse_context(span=span)

        result = None
        try:
            result = func(*args, **kwargs)
            span.update(output=result)
            return result
        except Exception as e:
            stacktrace = traceback.format_exc()
            error_message = f"{type(e).__name__}: {str(e)}\n{stacktrace}"
            span.update(status_message=error_message, level="ERROR")
            raise
        finally:
            span.end()
            update_langfuse_context(span=None)  # Clear span after completion

    return wrapper
