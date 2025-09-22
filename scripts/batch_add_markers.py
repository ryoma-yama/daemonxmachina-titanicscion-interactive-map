#!/usr/bin/env python3
"""
Batch Marker Addition Script for Daemon X Machina: Titanic Scion Interactive Map

This script processes a file with marker data and adds them using add_marker.py.
Each line should be in format: map_id x y category "name" "description"
"""

import subprocess
import sys
import re
from pathlib import Path


def parse_marker_line(line):
    """Parse a line with marker data."""
    line = line.strip()
    if not line or line.startswith('#'):
        return None
    
    # Pattern to match: map_id x y category "name" "description"
    # This handles quoted strings that may contain spaces
    pattern = r'^(\w+)\s+(\d+)\s+(\d+)\s+(\w+)\s+"([^"]*)"(?:\s+"([^"]*)")?'
    match = re.match(pattern, line)
    
    if not match:
        print(f"Warning: Could not parse line: {line}")
        return None
    
    map_id, x, y, category, name, description = match.groups()
    
    return {
        'map_id': map_id,
        'x': int(x),
        'y': int(y),
        'category': category,
        'name': name,
        'description': description or ''
    }


def run_add_marker(marker_data, dry_run=False):
    """Run add_marker.py with the given marker data."""
    cmd = [
        'python', 'scripts/add_marker.py',
        marker_data['map_id'],
        str(marker_data['x']),
        str(marker_data['y']),
        marker_data['category'],
        marker_data['name']
    ]
    
    # Add description if not empty
    if marker_data['description']:
        cmd.append(marker_data['description'])
    
    if dry_run:
        cmd.append('--dry-run')
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, f"Error: {e.stderr}"


def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python scripts/batch_add_markers.py <input_file> [--dry-run]")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv
    
    if not input_file.exists():
        print(f"Error: File {input_file} does not exist")
        sys.exit(1)
    
    print(f"Processing markers from: {input_file}")
    if dry_run:
        print("DRY RUN mode - no files will be modified")
    print()
    
    # Read and process file
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    success_count = 0
    error_count = 0
    
    for line_num, line in enumerate(lines, 1):
        marker_data = parse_marker_line(line)
        if not marker_data:
            continue
        
        print(f"Processing line {line_num}: {marker_data['name']}")
        
        success, output = run_add_marker(marker_data, dry_run)
        if success:
            success_count += 1
            if not dry_run:
                print(f"  ✓ Added successfully")
        else:
            error_count += 1
            print(f"  ✗ Failed: {output}")
        
        # Show minimal output for successful additions unless dry run
        if dry_run or not success:
            print(f"    Output: {output[:200]}...")
        
        print()
    
    print(f"Summary:")
    print(f"  Successful: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Total processed: {success_count + error_count}")


if __name__ == '__main__':
    main()