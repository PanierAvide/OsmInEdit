# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased


## 1.0.15 - 2024-03-19

### Changed
- Switched OSM authentication to OAuth 2


## 1.0.14 - 2023-08-16

### Fixed
- Mapbox tiles without token were breaking the editor (thanks to [Elian Doran](https://framagit.org/elian) for the fix)


## 1.0.13 - 2023-03-30

### Changed
- Update Mapbox tiles URLs to use a dedicated access token


## 1.0.12 - 2022-05-12

### Fixed
- Updated broken libraries (thanks to Alejandro Nigrelli)


## 1.0.11 - 2022-01-04

### Added
- Allow preview current edits on [indoor=](https://indoorequal.org/) (thanks to François de Metz)

### Fixed
- Prevent empty tag key or value to be sent to OSM


## 1.0.10 - 2021-08-16

### Added
- Button to ask for review when sending changeset (`review_request=yes` changeset tag)

### Fixed
- Tile providers with `crs` parameter defined caused freeze of UI


## 1.0.9 - 2020-03-28

### Fixed
- Fix duplicate values in `level` tag
- Better handling of existing `repeat_on` tag


## 1.0.8 - 2020-03-05

### Fixed
- Handle outdoor sports centre as landuse
- Read URL with hash missing part of level info


## 1.0.7 - 2020-02-12

### Changed
- Updated de + it translations


## 1.0.6 - 2019-11-12

### Fixed
- Deletion of features being part of a non-geometrical relation


## 1.0.5 - 2019-10-10

### Added
- List of used imagery is added to changeset informations (tag `imagery_used`)
- User can add used source for edits (tag `source` in changeset)

### Changed
- Support decimal levels when editing (they are visible in level selector)


## 1.0.4 - 2019-10-10

### Added
- 🇩🇪 German translation (thanks to TuringTux and schwukas)


## 1.0.3 - 2019-10-05

### Changed
- Buildings are now filtered on map according to selected level
- Level selector properly handles areas with many levels


## 1.0.2 - 2019-09-26

### Changed
- Improved metadata in `index.html` file

### Fixed
- Door nodes are now merged with vertex node if they are overlapping
- List of edits in changeset pane always display correct name


## 1.0.1 - 2019-09-25

### Added
- 🇮🇹 Italian translation (thanks to napolnx)

### Changed
- Allow double click zoom on explore mode


# 1.0.0 - 2019-09-19

### Added
- Initial release of the editor, which allows to view indoor data, manage floor plan images, edit OpenStreetMap indoor data and send changes.
