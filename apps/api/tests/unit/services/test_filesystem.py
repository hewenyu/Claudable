"""
Unit tests for Filesystem Service  
"""
import os
import tempfile
from pathlib import Path

import pytest

from app.services.filesystem import ensure_dir


@pytest.mark.unit
@pytest.mark.services
def test_ensure_dir_creates_directory():
    """Test that ensure_dir creates a directory if it doesn't exist."""
    with tempfile.TemporaryDirectory() as temp_dir:
        test_dir = os.path.join(temp_dir, "test_directory")
        
        # Directory should not exist yet
        assert not os.path.exists(test_dir)
        
        # Call ensure_dir
        ensure_dir(test_dir)
        
        # Directory should now exist
        assert os.path.exists(test_dir)
        assert os.path.isdir(test_dir)


@pytest.mark.unit
@pytest.mark.services
def test_ensure_dir_existing_directory():
    """Test that ensure_dir works with existing directory."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Directory already exists
        assert os.path.exists(temp_dir)
        
        # Call ensure_dir - should not raise an error
        ensure_dir(temp_dir)
        
        # Directory should still exist
        assert os.path.exists(temp_dir)
        assert os.path.isdir(temp_dir)


@pytest.mark.unit
@pytest.mark.services
def test_ensure_dir_nested_directories():
    """Test that ensure_dir creates nested directories."""
    with tempfile.TemporaryDirectory() as temp_dir:
        nested_dir = os.path.join(temp_dir, "level1", "level2", "level3")
        
        # Directory should not exist yet
        assert not os.path.exists(nested_dir)
        
        # Call ensure_dir
        ensure_dir(nested_dir)
        
        # All directories should now exist
        assert os.path.exists(nested_dir)
        assert os.path.isdir(nested_dir)
        assert os.path.exists(os.path.join(temp_dir, "level1"))
        assert os.path.exists(os.path.join(temp_dir, "level1", "level2"))


@pytest.mark.unit
@pytest.mark.services 
def test_ensure_dir_with_pathlib():
    """Test that ensure_dir works with pathlib.Path objects."""
    with tempfile.TemporaryDirectory() as temp_dir:
        test_path = Path(temp_dir) / "pathlib_test"
        
        # Directory should not exist yet
        assert not test_path.exists()
        
        # Call ensure_dir with string version
        ensure_dir(str(test_path))
        
        # Directory should now exist
        assert test_path.exists()
        assert test_path.is_dir()


# Note: We're not testing git operations or Next.js scaffolding in unit tests
# as those require external dependencies and would be better suited for integration tests
# or mocked tests. The filesystem operations tested above are the core functionality
# that can be safely tested in isolation.