"""
Test cases for project detection functionality
"""

import json
import os
import tempfile
import unittest
from pathlib import Path

from app.services.project_detector import (
    get_dev_command,
    get_frontend_framework,
    is_frontend_project,
)


class TestProjectDetector(unittest.TestCase):
    
    def setUp(self):
        """Create temporary directory for test projects"""
        self.test_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up temporary directory"""
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def create_package_json(self, content):
        """Helper to create package.json in test directory"""
        package_path = os.path.join(self.test_dir, "package.json")
        with open(package_path, 'w') as f:
            json.dump(content, f)
        return package_path
    
    def test_no_package_json(self):
        """Test detection when no package.json exists"""
        is_frontend, reason = is_frontend_project(self.test_dir)
        self.assertFalse(is_frontend)
        self.assertIn("No package.json found", reason)
    
    def test_next_js_project(self):
        """Test detection of Next.js project"""
        package_content = {
            "name": "test-nextjs",
            "scripts": {
                "dev": "next dev",
                "build": "next build",
                "start": "next start"
            },
            "dependencies": {
                "next": "^14.0.0",
                "react": "^18.0.0"
            }
        }
        self.create_package_json(package_content)
        
        is_frontend, reason = is_frontend_project(self.test_dir)
        self.assertTrue(is_frontend)
        self.assertIn("next", reason.lower())
        
        framework = get_frontend_framework(self.test_dir)
        self.assertEqual(framework, "Next.js")
        
        dev_cmd = get_dev_command(self.test_dir)
        self.assertEqual(dev_cmd, "dev")
    
    def test_react_project(self):
        """Test detection of React project"""
        package_content = {
            "name": "test-react",
            "scripts": {
                "start": "react-scripts start",
                "build": "react-scripts build"
            },
            "dependencies": {
                "react": "^18.0.0",
                "react-scripts": "^5.0.0"
            }
        }
        self.create_package_json(package_content)
        
        is_frontend, reason = is_frontend_project(self.test_dir)
        self.assertTrue(is_frontend)
        
        framework = get_frontend_framework(self.test_dir)
        self.assertEqual(framework, "React")
        
        dev_cmd = get_dev_command(self.test_dir)
        self.assertEqual(dev_cmd, "start")
    
    def test_vue_project(self):
        """Test detection of Vue project"""
        package_content = {
            "name": "test-vue",
            "scripts": {
                "serve": "vue-cli-service serve",
                "build": "vue-cli-service build"
            },
            "dependencies": {
                "vue": "^3.0.0"
            }
        }
        self.create_package_json(package_content)
        
        is_frontend, reason = is_frontend_project(self.test_dir)
        self.assertTrue(is_frontend)
        
        framework = get_frontend_framework(self.test_dir)
        self.assertEqual(framework, "Vue.js")
        
        dev_cmd = get_dev_command(self.test_dir)
        self.assertEqual(dev_cmd, "serve")
    
    def test_backend_node_project(self):
        """Test detection of backend Node.js project (should not be considered frontend)"""
        package_content = {
            "name": "test-backend",
            "scripts": {
                "test": "jest",
                "lint": "eslint ."
            },
            "dependencies": {
                "express": "^4.0.0",
                "mongoose": "^6.0.0"
            }
        }
        self.create_package_json(package_content)
        
        is_frontend, reason = is_frontend_project(self.test_dir)
        self.assertFalse(is_frontend)
        self.assertIn("No frontend development scripts found", reason)
    
    def test_invalid_package_json(self):
        """Test handling of invalid package.json"""
        package_path = os.path.join(self.test_dir, "package.json")
        with open(package_path, 'w') as f:
            f.write("{ invalid json")
        
        is_frontend, reason = is_frontend_project(self.test_dir)
        self.assertFalse(is_frontend)
        self.assertIn("Could not parse package.json", reason)
    
    def test_nonexistent_path(self):
        """Test handling of nonexistent project path"""
        fake_path = "/nonexistent/path"
        is_frontend, reason = is_frontend_project(fake_path)
        self.assertFalse(is_frontend)
        self.assertIn("does not exist", reason)


if __name__ == '__main__':
    unittest.main()