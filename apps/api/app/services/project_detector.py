"""
Project Type Detection Service
Determines if a project is a frontend project that supports preview functionality
"""

import json
import os
from typing import Dict, Optional, Tuple


def is_frontend_project(repo_path: str) -> Tuple[bool, Optional[str]]:
    """
    Determine if a project is a frontend project that supports preview functionality.
    
    Args:
        repo_path: Path to the project repository
        
    Returns:
        Tuple of (is_frontend, reason)
        - is_frontend: True if this is a frontend project
        - reason: Explanation of why it's considered frontend/non-frontend
    """
    if not repo_path or not os.path.exists(repo_path):
        return False, "Project repository path does not exist"
    
    # Check for package.json
    package_json_path = os.path.join(repo_path, "package.json")
    if not os.path.exists(package_json_path):
        return False, "No package.json found - not a Node.js/frontend project"
    
    try:
        # Parse package.json to check for frontend indicators
        with open(package_json_path, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
            
        # Check for development scripts that indicate a frontend project
        scripts = package_data.get('scripts', {})
        
        # Common frontend development scripts
        frontend_scripts = ['dev', 'start', 'serve', 'develop']
        has_dev_script = any(script in scripts for script in frontend_scripts)
        
        if not has_dev_script:
            return False, "No frontend development scripts found in package.json"
        
        # Check for frontend framework dependencies
        all_deps = {}
        all_deps.update(package_data.get('dependencies', {}))
        all_deps.update(package_data.get('devDependencies', {}))
        
        # Common frontend frameworks and libraries
        frontend_indicators = [
            'next', 'react', 'vue', 'angular', 'svelte', 'nuxt',
            'vite', 'webpack', 'parcel', 'rollup', 'esbuild',
            'create-react-app', 'gatsby', 'remix'
        ]
        
        found_frameworks = []
        for dep_name in all_deps.keys():
            for indicator in frontend_indicators:
                if indicator in dep_name.lower():
                    found_frameworks.append(dep_name)
                    break
        
        if found_frameworks:
            return True, f"Frontend project detected with: {', '.join(found_frameworks[:3])}"
        
        # Check for common frontend directories
        frontend_dirs = ['src', 'pages', 'app', 'public', 'static', 'assets']
        found_dirs = [d for d in frontend_dirs if os.path.exists(os.path.join(repo_path, d))]
        
        if found_dirs and has_dev_script:
            return True, f"Frontend project structure detected with dev scripts and directories: {', '.join(found_dirs[:3])}"
        
        # If we have dev scripts but no clear framework indicators,
        # it might still be a frontend project (custom setup)
        if has_dev_script:
            return True, "Frontend project detected with development scripts"
        
        return False, "No clear frontend project indicators found"
        
    except (json.JSONDecodeError, IOError) as e:
        return False, f"Could not parse package.json: {str(e)}"


def get_frontend_framework(repo_path: str) -> Optional[str]:
    """
    Get the primary frontend framework used in the project.
    
    Args:
        repo_path: Path to the project repository
        
    Returns:
        Name of the detected framework or None
    """
    if not os.path.exists(repo_path):
        return None
        
    package_json_path = os.path.join(repo_path, "package.json")
    if not os.path.exists(package_json_path):
        return None
    
    try:
        with open(package_json_path, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
            
        all_deps = {}
        all_deps.update(package_data.get('dependencies', {}))
        all_deps.update(package_data.get('devDependencies', {}))
        
        # Priority order for framework detection
        framework_priorities = [
            ('next', 'Next.js'),
            ('nuxt', 'Nuxt.js'),
            ('gatsby', 'Gatsby'),
            ('remix', 'Remix'),
            ('react', 'React'),
            ('vue', 'Vue.js'),
            ('angular', 'Angular'),
            ('svelte', 'Svelte'),
            ('vite', 'Vite'),
        ]
        
        for indicator, framework_name in framework_priorities:
            for dep_name in all_deps.keys():
                if indicator in dep_name.lower():
                    return framework_name
                    
        return None
        
    except (json.JSONDecodeError, IOError):
        return None


def get_dev_command(repo_path: str) -> Optional[str]:
    """
    Get the development command for the frontend project.
    
    Args:
        repo_path: Path to the project repository
        
    Returns:
        Development command or None
    """
    if not os.path.exists(repo_path):
        return None
        
    package_json_path = os.path.join(repo_path, "package.json")
    if not os.path.exists(package_json_path):
        return None
    
    try:
        with open(package_json_path, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
            
        scripts = package_data.get('scripts', {})
        
        # Priority order for dev commands
        dev_command_priorities = ['dev', 'start', 'serve', 'develop']
        
        for cmd in dev_command_priorities:
            if cmd in scripts:
                return cmd
                
        return None
        
    except (json.JSONDecodeError, IOError):
        return None