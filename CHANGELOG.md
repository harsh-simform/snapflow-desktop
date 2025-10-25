# Changelog

All notable changes to SnapFlow Desktop will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-10-25

### Added

- Global keyboard shortcuts for quick capture
  - **macOS**: Cmd+Shift+3 (Full Screen), Cmd+Shift+5 (Area)
  - **Windows/Linux**: Ctrl+Shift+3 (Full Screen), Ctrl+Shift+5 (Area)
- Window controls now show keyboard shortcuts in system tray menu
- Window controls added to annotate screen
- Improved WindowControls component with better visual feedback
- Support for macOS-style traffic light buttons variant
- Draggable titlebar across all application windows

### Changed

- Improved annotate screen layout to properly utilize available space
- Better screenshot dimension calculation accounting for all UI elements
- Enhanced window controls design with smoother hover effects
- Clearer restore down icon (two overlapping squares design)
- Window controls now flush with right edge (removed padding)
- Optimized canvas resizing with proper window resize handling
- Application menu simplified (removed File and Help menus on macOS, removed menu bar on Windows/Linux)

### Fixed

- Fixed infinite loop in annotate screen dimension calculation
- Fixed window controls missing from annotate page
- Fixed screenshot scaling issues with high-DPI displays
- Fixed restore down button icon visibility
- Fixed space utilization in annotate screen with keyboard shortcuts

### Technical Improvements

- Split dimension calculation into separate useEffects to prevent infinite loops
- Added resize event listeners for dynamic window sizing
- Improved TypeScript type safety in window controls
- Better accessibility with aria-labels and proper tooltips
- Enhanced responsive design for various screen sizes

## [1.0.0] - 2025-10-24

### Initial Release

- Screenshot capture (full screen, area selection, window capture)
- Screen recording with area selection
- Image annotation tools (pen, shapes, text, arrows)
- Issue tracking with local storage
- Cloud sync with Supabase
- GitHub integration for issue creation
- System tray integration
- Auto-update functionality
- Multi-display support
