"""
Tests for the Environment Variables Manager service
"""
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from sqlalchemy.orm import Session

from app.models.env_vars import EnvVar
from app.services.env_manager import (
    get_project_env_path,
    parse_env_file,
    sync_env_file_to_db,
    sync_db_to_env_file,
    load_env_vars_from_db,
    create_env_var,
    update_env_var,
    delete_env_var,
)


class TestEnvManager:
    """Test cases for environment variables manager"""

    def test_parse_env_file_empty(self):
        """Test parsing an empty .env file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
            f.write("")
            env_path = Path(f.name)
        
        result = parse_env_file(env_path)
        assert result == {}
        env_path.unlink()

    def test_parse_env_file_with_variables(self):
        """Test parsing .env file with various variable formats"""
        env_content = '''
# This is a comment
DATABASE_URL=postgresql://localhost:5432/test
API_KEY="secret-key-123"
DEBUG=true
EMPTY_VAR=
QUOTED_VAR='single-quoted-value'
# Another comment
PORT=3000
'''
        with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
            f.write(env_content)
            env_path = Path(f.name)
        
        result = parse_env_file(env_path)
        expected = {
            'DATABASE_URL': 'postgresql://localhost:5432/test',
            'API_KEY': 'secret-key-123',
            'DEBUG': 'true',
            'EMPTY_VAR': '',
            'QUOTED_VAR': 'single-quoted-value',
            'PORT': '3000'
        }
        assert result == expected
        env_path.unlink()

    def test_parse_env_file_nonexistent(self):
        """Test parsing a non-existent .env file"""
        non_existent_path = Path('/tmp/non-existent-file.env')
        result = parse_env_file(non_existent_path)
        assert result == {}

    @patch('app.services.env_manager.settings')
    def test_get_project_env_path(self, mock_settings):
        """Test getting project .env file path"""
        mock_settings.projects_root = "/tmp/projects"
        
        result = get_project_env_path("test-project")
        expected = Path("/tmp/projects/test-project/repo/.env")
        assert result == expected

    def test_load_env_vars_from_db(self, test_db_session: Session):
        """Test loading environment variables from database"""
        # Create test env vars
        env_var1 = EnvVar(
            id="test-id-1",
            project_id="test-project",
            key="TEST_VAR1",
            value_encrypted="encrypted_value1",
            scope="runtime",
            var_type="string",
            is_secret=True
        )
        env_var2 = EnvVar(
            id="test-id-2",
            project_id="test-project", 
            key="TEST_VAR2",
            value_encrypted="encrypted_value2",
            scope="runtime",
            var_type="string",
            is_secret=True
        )
        test_db_session.add_all([env_var1, env_var2])
        test_db_session.commit()

        # Mock the decryption
        with patch('app.services.env_manager.secret_box') as mock_secret_box:
            mock_secret_box.decrypt.side_effect = ["value1", "value2"]
            
            result = load_env_vars_from_db(test_db_session, "test-project")
            assert len(result) == 2
            assert result["TEST_VAR1"] == "value1"
            assert result["TEST_VAR2"] == "value2"

    @patch('app.services.env_manager.secret_box')
    def test_create_env_var_new(self, mock_secret_box, test_db_session: Session):
        """Test creating a new environment variable"""
        mock_secret_box.encrypt.return_value = "encrypted_value"
        
        with patch('app.services.env_manager.sync_db_to_env_file'):
            result = create_env_var(
                test_db_session, 
                "test-project", 
                "NEW_VAR", 
                "new_value"
            )
            
            assert result.key == "NEW_VAR"
            assert result.project_id == "test-project"
            assert result.value_encrypted == "encrypted_value"
            assert result.is_secret is True

    @patch('app.services.env_manager.secret_box')
    def test_update_env_var_existing(self, mock_secret_box, test_db_session: Session):
        """Test updating an existing environment variable"""
        mock_secret_box.encrypt.return_value = "encrypted_new_value"
        
        # Create initial var
        env_var = EnvVar(
            id="test-id",
            project_id="test-project",
            key="EXISTING_VAR",
            value_encrypted="encrypted_old_value",
            scope="runtime",
            var_type="string",
            is_secret=True
        )
        test_db_session.add(env_var)
        test_db_session.commit()

        # Update it
        with patch('app.services.env_manager.sync_db_to_env_file'):
            result = update_env_var(
                test_db_session,
                "test-project",
                "EXISTING_VAR", 
                "new_value"
            )
            
        assert result is True
        
        # Verify it was updated in database
        updated_var = test_db_session.query(EnvVar).filter_by(key="EXISTING_VAR").first()
        assert updated_var.value_encrypted == "encrypted_new_value"

    def test_delete_env_var_existing(self, test_db_session: Session):
        """Test deleting an existing environment variable"""
        # Create var to delete
        env_var = EnvVar(
            id="test-id",
            project_id="test-project",
            key="TO_DELETE",
            value_encrypted="encrypted_value",
            scope="runtime",
            var_type="string",
            is_secret=True
        )
        test_db_session.add(env_var)
        test_db_session.commit()

        with patch('app.services.env_manager.sync_db_to_env_file'):
            result = delete_env_var(test_db_session, "test-project", "TO_DELETE")
        
        assert result is True
        
        # Verify it's deleted
        remaining_var = test_db_session.query(EnvVar).filter_by(key="TO_DELETE").first()
        assert remaining_var is None

    def test_delete_env_var_nonexistent(self, test_db_session: Session):
        """Test deleting a non-existent environment variable"""
        result = delete_env_var(test_db_session, "test-project", "NON_EXISTENT")
        assert result is False

    @patch('app.services.env_manager.get_project_env_path')
    @patch('app.services.env_manager.secret_box')
    def test_sync_env_file_to_db(self, mock_secret_box, mock_get_path, test_db_session: Session):
        """Test syncing .env file to database"""
        mock_secret_box.encrypt.return_value = "encrypted_value"
        
        # Create temporary .env file
        env_content = '''
DATABASE_URL=postgresql://localhost:5432/test
API_KEY=secret123
DEBUG=true
'''
        with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
            f.write(env_content)
            temp_path = Path(f.name)
        
        mock_get_path.return_value = temp_path
        
        result = sync_env_file_to_db(test_db_session, "test-project")
        
        # Verify vars were created in DB
        vars_in_db = test_db_session.query(EnvVar).filter_by(project_id="test-project").all()
        assert len(vars_in_db) == 3
        assert result == 3  # Should return count of synced vars
        
        var_keys = {var.key for var in vars_in_db}
        assert 'DATABASE_URL' in var_keys
        assert 'API_KEY' in var_keys
        assert 'DEBUG' in var_keys
        
        temp_path.unlink()

    @patch('app.services.env_manager.get_project_env_path')
    @patch('app.services.env_manager.secret_box')
    def test_sync_db_to_env_file(self, mock_secret_box, mock_get_path, test_db_session: Session):
        """Test syncing database to .env file"""
        mock_secret_box.decrypt.side_effect = ["value1", "value with spaces", ""]
        
        # Create temp file path
        with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
            temp_path = Path(f.name)
        
        mock_get_path.return_value = temp_path
        
        # Create env vars in DB
        env_vars = [
            EnvVar(id="1", project_id="test-project", key="VAR1", value_encrypted="enc1", scope="runtime", var_type="string", is_secret=True),
            EnvVar(id="2", project_id="test-project", key="VAR2", value_encrypted="enc2", scope="runtime", var_type="string", is_secret=True),
            EnvVar(id="3", project_id="test-project", key="VAR3", value_encrypted="enc3", scope="runtime", var_type="string", is_secret=True),
        ]
        test_db_session.add_all(env_vars)
        test_db_session.commit()
        
        result = sync_db_to_env_file(test_db_session, "test-project")
        
        # Verify .env file was created correctly
        with open(temp_path, 'r') as f:
            content = f.read()
        
        assert 'VAR1=value1' in content
        assert 'VAR2="value with spaces"' in content
        assert 'VAR3=' in content
        assert result == 3  # Should return count
        
        temp_path.unlink()