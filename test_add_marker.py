#!/usr/bin/env python3
"""
Tests for add_marker.py script.
"""

import json
import tempfile
import os
import sys
from pathlib import Path

# Add scripts directory to path for importing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))

from add_marker import (
    load_geojson,
    save_geojson,
    extract_existing_data,
    generate_next_id,
    check_duplicates,
    create_marker_feature,
    add_marker_to_geojson,
    VALID_CATEGORIES
)


def test_load_geojson_existing_file():
    """Test loading existing GeoJSON file."""
    # Test with existing forest.geojson
    file_path = Path('assets/data/markers/forest.geojson')
    data = load_geojson(file_path)
    
    assert data['type'] == 'FeatureCollection'
    assert 'features' in data
    assert isinstance(data['features'], list)
    assert len(data['features']) > 0


def test_load_geojson_nonexistent_file():
    """Test loading non-existent GeoJSON file creates new structure."""
    with tempfile.NamedTemporaryFile(delete=True) as tmp:
        file_path = Path(tmp.name + '.geojson')
        data = load_geojson(file_path)
        
        assert data['type'] == 'FeatureCollection'
        assert data['features'] == []


def test_save_geojson():
    """Test saving GeoJSON to file."""
    test_data = {
        "type": "FeatureCollection",
        "features": []
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as tmp:
        file_path = Path(tmp.name)
        
    try:
        save_geojson(file_path, test_data)
        
        # Verify file was created and contains correct data
        assert file_path.exists()
        with open(file_path, 'r') as f:
            saved_data = json.load(f)
        assert saved_data == test_data
        
    finally:
        if file_path.exists():
            file_path.unlink()


def test_extract_existing_data():
    """Test extracting IDs, coordinates, and names from GeoJSON."""
    test_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [100, 200]},
                "properties": {"id": "test-001", "name": "Test Marker", "category": "card"}
            },
            {
                "type": "Feature", 
                "geometry": {"type": "Point", "coordinates": [300, 400]},
                "properties": {"id": "test-002", "name": "Another Marker", "category": "chest"}
            }
        ]
    }
    
    ids, coords, names = extract_existing_data(test_data)
    
    assert "test-001" in ids
    assert "test-002" in ids
    assert (100, 200) in coords
    assert (300, 400) in coords
    assert "Test Marker" in names
    assert "Another Marker" in names


def test_generate_next_id():
    """Test ID generation with various existing IDs."""
    # Test with no existing IDs
    existing_ids = set()
    next_id = generate_next_id("forest", existing_ids)
    assert next_id == "forest-0001"
    
    # Test with existing IDs
    existing_ids = {"forest-0001", "forest-0002", "forest-0005"}
    next_id = generate_next_id("forest", existing_ids)
    assert next_id == "forest-0006"
    
    # Test with mixed IDs (some from different maps)
    existing_ids = {"forest-0001", "desert-0001", "forest-0003"}
    next_id = generate_next_id("forest", existing_ids)
    assert next_id == "forest-0004"


def test_check_duplicates():
    """Test duplicate checking function."""
    existing_ids = {"test-001"}
    existing_coords = {(100, 200)}
    existing_names = {"Existing Marker"}
    
    # Test with no duplicates
    assert check_duplicates("test-002", 300, 400, "New Marker", 
                           existing_ids, existing_coords, existing_names) == True
    
    # Test with ID duplicate
    assert check_duplicates("test-001", 300, 400, "New Marker",
                           existing_ids, existing_coords, existing_names) == False
    
    # Test with coordinate duplicate
    assert check_duplicates("test-002", 100, 200, "New Marker",
                           existing_ids, existing_coords, existing_names) == False
    
    # Test with name duplicate
    assert check_duplicates("test-002", 300, 400, "Existing Marker",
                           existing_ids, existing_coords, existing_names) == False


def test_create_marker_feature():
    """Test marker feature creation."""
    feature = create_marker_feature("test-001", "Test Marker", "card", 100, 200)
    
    assert feature['type'] == 'Feature'
    assert feature['geometry']['type'] == 'Point'
    assert feature['geometry']['coordinates'] == [100, 200]
    assert feature['properties']['id'] == 'test-001'
    assert feature['properties']['name'] == 'Test Marker'
    assert feature['properties']['category'] == 'card'


def test_add_marker_to_geojson():
    """Test adding marker to GeoJSON FeatureCollection."""
    geojson_data = {
        "type": "FeatureCollection",
        "features": []
    }
    
    marker_feature = create_marker_feature("test-001", "Test Marker", "card", 100, 200)
    updated_data = add_marker_to_geojson(geojson_data, marker_feature)
    
    assert len(updated_data['features']) == 1
    assert updated_data['features'][0] == marker_feature


def test_valid_categories():
    """Test that valid categories are properly defined."""
    expected_categories = ['bgm', 'card', 'chest', 'enemy', 'log']
    assert VALID_CATEGORIES == expected_categories


if __name__ == '__main__':
    # Run tests manually if pytest is not available
    import traceback
    
    test_functions = [
        test_load_geojson_existing_file,
        test_load_geojson_nonexistent_file,
        test_save_geojson,
        test_extract_existing_data,
        test_generate_next_id,
        test_check_duplicates,
        test_create_marker_feature,
        test_add_marker_to_geojson,
        test_valid_categories
    ]
    
    passed = 0
    failed = 0
    
    for test_func in test_functions:
        try:
            test_func()
            print(f"✓ {test_func.__name__}")
            passed += 1
        except Exception as e:
            print(f"✗ {test_func.__name__}: {e}")
            traceback.print_exc()
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    if failed > 0:
        sys.exit(1)