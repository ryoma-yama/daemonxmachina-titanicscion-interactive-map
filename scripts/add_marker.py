#!/usr/bin/env python3
"""
Marker Addition Script for Daemon X Machina: Titanic Scion Interactive Map

This script adds markers to GeoJSON files for the interactive map.
Usage: python scripts/add_marker.py {map_id} {category} "{name}" {x} {y}
"""

import argparse
import json
import sys
from pathlib import Path


# Valid categories based on existing project structure
# NOTE: This list must be synchronized with the 'colors' object in src/icons.js
# Any changes here should be reflected in the frontend icon system
VALID_CATEGORIES = ['bgm', 'card', 'chest', 'decal', 'enemy', 'log']

# Default paths
DEFAULT_MARKERS_DIR = 'assets/data/markers'


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Add markers to GeoJSON files for the interactive map',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/add_marker.py forest card "Rare Card" 800 600
  python scripts/add_marker.py desert chest "Hidden Treasure" 400 300 --dry-run
  python scripts/add_marker.py --categories
        """
    )
    
    # Optional arguments that can be used standalone
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be added without modifying files')
    parser.add_argument('--categories', action='store_true',
                       help='List valid categories and exit')
    
    # Required arguments (only when not using --categories)
    parser.add_argument('map_id', nargs='?', help='Map identifier. Available maps: forest, desert, mountains')
    parser.add_argument('category', nargs='?', choices=VALID_CATEGORIES, 
                       help=f'Marker category. Valid options: {", ".join(VALID_CATEGORIES)}')
    parser.add_argument('name', nargs='?', help='Marker name/title')
    parser.add_argument('x', nargs='?', type=int, help='X coordinate (horizontal)')
    parser.add_argument('y', nargs='?', type=int, help='Y coordinate (vertical)')
    
    args = parser.parse_args()
    
    # Validate arguments based on usage
    if args.categories:
        return args
    
    # Check that all required arguments are provided when not using --categories
    missing_args = []
    if args.map_id is None:
        missing_args.append('map_id')
    if args.category is None:
        missing_args.append('category')
    if args.name is None:
        missing_args.append('name')
    if args.x is None:
        missing_args.append('x')
    if args.y is None:
        missing_args.append('y')
    
    if missing_args:
        parser.error(f"the following arguments are required: {', '.join(missing_args)}")
    
    return args


def show_categories():
    """Display valid categories and exit."""
    print("Valid marker categories:")
    for category in VALID_CATEGORIES:
        print(f"  - {category}")
    sys.exit(0)


def get_file_path(map_id):
    """Get the file path for the marker data."""
    return Path(DEFAULT_MARKERS_DIR) / f"{map_id}.geojson"


def validate_inputs(args):
    """Validate input arguments."""
    # Validate coordinates are non-negative
    if args.x < 0 or args.y < 0:
        print(f"Error: Coordinates must be non-negative. Got x={args.x}, y={args.y}", file=sys.stderr)
        sys.exit(1)
    
    # Validate marker name is not empty
    if not args.name.strip():
        print("Error: Marker name cannot be empty", file=sys.stderr)
        sys.exit(1)


def load_geojson(file_path):
    """Load existing GeoJSON file or create new FeatureCollection structure."""
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Validate GeoJSON structure
            if not isinstance(data, dict) or data.get('type') != 'FeatureCollection':
                raise ValueError("File is not a valid GeoJSON FeatureCollection")
            
            if 'features' not in data or not isinstance(data['features'], list):
                raise ValueError("Invalid GeoJSON: 'features' must be a list")
            
            return data
        
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")
        except Exception as e:
            raise ValueError(f"Error reading file: {e}")
    
    else:
        # Create new FeatureCollection structure
        return {
            "type": "FeatureCollection",
            "features": []
        }


def save_geojson(file_path, data):
    """Save GeoJSON data to file with pretty formatting."""
    # Ensure parent directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')  # Add trailing newline
        
        return True
    
    except Exception as e:
        raise ValueError(f"Error writing file: {e}")


def extract_existing_data(geojson_data):
    """Extract existing IDs, coordinates, and names from GeoJSON."""
    existing_ids = set()
    existing_coords = set()
    existing_names = set()
    
    for feature in geojson_data.get('features', []):
        # Extract ID
        if 'properties' in feature and 'id' in feature['properties']:
            existing_ids.add(feature['properties']['id'])
        
        # Extract coordinates
        if 'geometry' in feature and 'coordinates' in feature['geometry']:
            coords = feature['geometry']['coordinates']
            if len(coords) >= 2:
                existing_coords.add((int(coords[0]), int(coords[1])))
        
        # Extract name
        if 'properties' in feature and 'name' in feature['properties']:
            existing_names.add(feature['properties']['name'])
    
    return existing_ids, existing_coords, existing_names


def generate_next_id(map_id, existing_ids):
    """Generate next available ID in format {map_id}-{3-digit number}."""
    prefix = f"{map_id}-"
    max_number = 0
    
    # Find the highest existing number for this map
    for existing_id in existing_ids:
        if existing_id.startswith(prefix):
            suffix = existing_id[len(prefix):]
            if suffix.isdigit():
                max_number = max(max_number, int(suffix))
    
    # Generate next ID with 3-digit format to match existing convention
    next_number = max_number + 1
    return f"{prefix}{next_number:03d}"


def check_duplicates(marker_id, x, y, name, existing_ids, existing_coords, existing_names):
    """Check for duplicate IDs, coordinates, and names."""
    warnings = []
    
    # Check ID duplication
    if marker_id in existing_ids:
        warnings.append(f"ID '{marker_id}' already exists")
    
    # Check coordinate duplication
    coord_tuple = (x, y)
    if coord_tuple in existing_coords:
        warnings.append(f"Coordinates ({x}, {y}) already exist")
    
    # Check name duplication
    if name in existing_names:
        warnings.append(f"Name '{name}' already exists")
    
    if warnings:
        print("Error: Duplicate data detected:", file=sys.stderr)
        for warning in warnings:
            print(f"  - {warning}", file=sys.stderr)
        return False
    
    return True


def create_marker_feature(marker_id, name, category, x, y):
    """Create a GeoJSON Feature for the marker."""
    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [x, y]
        },
        "properties": {
            "id": marker_id,
            "name": name,
            "category": category
        }
    }


def add_marker_to_geojson(geojson_data, marker_feature):
    """Add marker feature to GeoJSON FeatureCollection."""
    if 'features' not in geojson_data:
        geojson_data['features'] = []
    
    geojson_data['features'].append(marker_feature)
    
    # Sort features by ID for consistent ordering
    geojson_data['features'].sort(key=lambda f: f.get('properties', {}).get('id', ''))
    
    return geojson_data


def display_marker_preview(marker_feature, file_path):
    """Display preview of the marker that would be added."""
    props = marker_feature['properties']
    coords = marker_feature['geometry']['coordinates']
    
    print("\nMarker to be added:")
    print(f"  ID: {props['id']}")
    print(f"  Name: {props['name']}")
    print(f"  Category: {props['category']}")
    print(f"  Coordinates: ({coords[0]}, {coords[1]})")
    print(f"  Target file: {file_path}")
    
    # Display JSON representation
    print("\nJSON representation:")
    print(json.dumps(marker_feature, indent=2, ensure_ascii=False))


def main():
    """Main function."""
    args = parse_arguments()
    
    # Handle --categories option
    if args.categories:
        show_categories()
    
    # Validate inputs
    validate_inputs(args)
    
    try:
        # Get file path
        file_path = get_file_path(args.map_id)
        
        print(f"Target file: {file_path}")
        print(f"Map ID: {args.map_id}")
        print(f"Category: {args.category}")
        print(f"Name: {args.name}")
        print(f"Coordinates: ({args.x}, {args.y})")
        
        # Load existing GeoJSON data
        print(f"\nLoading GeoJSON data from {file_path}...")
        geojson_data = load_geojson(file_path)
        
        # Extract existing data for duplicate checking
        existing_ids, existing_coords, existing_names = extract_existing_data(geojson_data)
        print(f"Found {len(existing_ids)} existing markers")
        
        # Generate marker ID
        marker_id = generate_next_id(args.map_id, existing_ids)
        print(f"Generated ID: {marker_id}")
        
        # Check for duplicates
        if not check_duplicates(marker_id, args.x, args.y, args.name, 
                               existing_ids, existing_coords, existing_names):
            sys.exit(1)
        
        # Create marker feature
        marker_feature = create_marker_feature(marker_id, args.name, args.category, args.x, args.y)
        
        # Handle dry run
        if args.dry_run:
            print("\n[DRY RUN] No files will be modified")
            display_marker_preview(marker_feature, file_path)
            return
        
        # Add marker to GeoJSON
        updated_geojson = add_marker_to_geojson(geojson_data, marker_feature)
        
        # Save updated GeoJSON
        print(f"\nSaving updated GeoJSON to {file_path}...")
        save_geojson(file_path, updated_geojson)
        
        print(f"✓ Marker '{args.name}' successfully added with ID '{marker_id}'")
        print(f"✓ Total markers in file: {len(updated_geojson['features'])}")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()