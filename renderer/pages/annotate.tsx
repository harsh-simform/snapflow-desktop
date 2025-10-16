import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function AnnotatePage() {
  const router = useRouter();
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Konva state
  const [Stage, setStage] = useState<any>(null);
  const [Layer, setLayer] = useState<any>(null);
  const [KonvaImage, setKonvaImage] = useState<any>(null);
  const [Line, setLine] = useState<any>(null);
  const [Rect, setRect] = useState<any>(null);
  const [Circle, setCircle] = useState<any>(null);
  const [Arrow, setArrow] = useState<any>(null);
  const [Text, setText] = useState<any>(null);
  const [Transformer, setTransformer] = useState<any>(null);

  const [tool, setTool] = useState<"select" | "pen" | "arrow" | "rectangle" | "circle" | "text">("select");
  const [color, setColor] = useState("#EF4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fillOpacity, setFillOpacity] = useState(0);
  const [shapes, setShapes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<any>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");

  useEffect(() => {
    loadUser();

    // Dynamically load react-konva to avoid SSR issues
    let mounted = true;

    import("react-konva")
      .then((konvaModule) => {
        if (!mounted) return;
        setStage(konvaModule.Stage);
        setLayer(konvaModule.Layer);
        setKonvaImage(konvaModule.Image);
        setLine(konvaModule.Line);
        setRect(konvaModule.Rect);
        setCircle(konvaModule.Circle);
        setArrow(konvaModule.Arrow);
        setText(konvaModule.Text);
        setTransformer(konvaModule.Transformer);
      })
      .catch((err) => {
        console.error("Failed to load Konva:", err);
        toast.error("Failed to load image editor");
      });

    // Listen for screenshot captured event
    const cleanup = window.api.onScreenshotCaptured((data: any) => {
      setScreenshot(data.dataUrl);
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setTool("select");
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.key === "v" || e.key === "V") {
        setTool("select");
      } else if (e.key === "p" || e.key === "P") {
        setTool("pen");
      } else if (e.key === "a" || e.key === "A") {
        setTool("arrow");
      } else if (e.key === "r" || e.key === "R") {
        setTool("rectangle");
      } else if (e.key === "c" || e.key === "C") {
        setTool("circle");
      } else if (e.key === "t" || e.key === "T") {
        setTool("text");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      mounted = false;
      cleanup();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingTextId, selectedId, shapes]);

  useEffect(() => {
    if (!screenshot) return;

    const img = new Image();
    img.onload = () => {
      setImage(img);

      // Calculate dimensions to fit viewport
      const containerWidth = containerRef.current?.clientWidth || 1200;
      const containerHeight = containerRef.current?.clientHeight || 800;
      const maxWidth = containerWidth - 48;
      const maxHeight = containerHeight - 48;

      const scaleX = maxWidth / img.width;
      const scaleY = maxHeight / img.height;
      const scale = Math.min(scaleX, scaleY, 1);

      setDimensions({
        width: img.width * scale,
        height: img.height * scale,
      });
    };
    img.src = screenshot;
  }, [screenshot]);

  const loadUser = async () => {
    const result = await window.api.getUser();
    if (result.success && result.data) {
      setCurrentUser(result.data);
    }
  };

  const handleMouseDown = (e: any) => {
    if (tool === "select") return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === "pen") {
      setIsDrawing(true);
      const newShape = {
        id: `shape-${Date.now()}`,
        type: "line",
        points: [point.x, point.y],
        stroke: color,
        strokeWidth: strokeWidth,
        tension: 0.5,
        lineCap: "round",
        lineJoin: "round",
      };
      setCurrentShape(newShape);
    } else if (tool === "arrow") {
      const newShape = {
        id: `shape-${Date.now()}`,
        type: "arrow",
        points: [point.x, point.y, point.x, point.y],
        stroke: color,
        strokeWidth: strokeWidth,
        fill: color,
        pointerLength: 10,
        pointerWidth: 10,
      };
      setCurrentShape(newShape);
      setIsDrawing(true);
    } else if (tool === "rectangle") {
      const fillColor = fillOpacity > 0 ? color : "transparent";
      const newShape = {
        id: `shape-${Date.now()}`,
        type: "rect",
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        stroke: color,
        strokeWidth: strokeWidth,
        fill: fillColor,
        opacity: fillOpacity > 0 ? fillOpacity : 1,
      };
      setCurrentShape(newShape);
      setIsDrawing(true);
    } else if (tool === "circle") {
      const fillColor = fillOpacity > 0 ? color : "transparent";
      const newShape = {
        id: `shape-${Date.now()}`,
        type: "circle",
        x: point.x,
        y: point.y,
        radius: 0,
        stroke: color,
        strokeWidth: strokeWidth,
        fill: fillColor,
        opacity: fillOpacity > 0 ? fillOpacity : 1,
      };
      setCurrentShape(newShape);
      setIsDrawing(true);
    } else if (tool === "text") {
      const newShape = {
        id: `shape-${Date.now()}`,
        type: "text",
        x: point.x,
        y: point.y,
        text: "Double click to edit",
        fontSize: 24,
        fill: color,
        fontFamily: "Inter, sans-serif",
      };
      setShapes([...shapes, newShape]);
      setTool("select");
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !currentShape) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === "pen" && currentShape.type === "line") {
      const updatedShape = {
        ...currentShape,
        points: [...currentShape.points, point.x, point.y],
      };
      setCurrentShape(updatedShape);
    } else if (tool === "arrow" && currentShape.type === "arrow") {
      const startX = currentShape.points[0];
      const startY = currentShape.points[1];
      const updatedShape = {
        ...currentShape,
        points: [startX, startY, point.x, point.y],
      };
      setCurrentShape(updatedShape);
    } else if (tool === "rectangle" && currentShape.type === "rect") {
      const updatedShape = {
        ...currentShape,
        width: point.x - currentShape.x,
        height: point.y - currentShape.y,
      };
      setCurrentShape(updatedShape);
    } else if (tool === "circle" && currentShape.type === "circle") {
      const radius = Math.sqrt(
        Math.pow(point.x - currentShape.x, 2) + Math.pow(point.y - currentShape.y, 2)
      );
      const updatedShape = {
        ...currentShape,
        radius,
      };
      setCurrentShape(updatedShape);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) return;

    setShapes([...shapes, currentShape]);
    setCurrentShape(null);
    setIsDrawing(false);
    setTool("select");
  };

  const handleDelete = () => {
    if (!selectedId) return;
    setShapes(shapes.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  };

  const handleUndo = () => {
    if (shapes.length === 0) return;
    setShapes(shapes.slice(0, -1));
    setSelectedId(null);
  };

  const handleClearAll = () => {
    if (shapes.length === 0) return;
    if (confirm("Are you sure you want to clear all annotations?")) {
      setShapes([]);
      setSelectedId(null);
    }
  };

  const handleTextDblClick = (id: string) => {
    const shape = shapes.find((s) => s.id === id);
    if (!shape || shape.type !== "text") return;

    setEditingTextId(id);
    setEditingTextValue(shape.text);
  };

  const handleTextEditSave = () => {
    if (editingTextId && editingTextValue.trim()) {
      setShapes(
        shapes.map((s) =>
          s.id === editingTextId ? { ...s, text: editingTextValue } : s
        )
      );
    }
    setEditingTextId(null);
    setEditingTextValue("");
  };

  const handleTextEditCancel = () => {
    setEditingTextId(null);
    setEditingTextValue("");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!currentUser) {
      toast.error("User not found. Please login again.");
      router.push("/auth");
      return;
    }

    if (!stageRef.current) {
      toast.error("Editor not ready");
      return;
    }

    setSaving(true);

    try {
      const stage = stageRef.current;
      const dataUrl = stage.toDataURL({
        mimeType: "image/png",
        quality: 1,
        pixelRatio: 2,
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const tempId = `SF-${Date.now()}`;

      const saveResult = await window.api.saveCapture(tempId, arrayBuffer);
      if (!saveResult.success) {
        toast.error(`Failed to save screenshot: ${saveResult.error}`);
        setSaving(false);
        return;
      }

      const issueResult = await window.api.createIssue(
        currentUser.id,
        title,
        "screenshot",
        saveResult.data.filePath,
        description || undefined,
        saveResult.data.thumbnailPath
      );

      if (issueResult.success) {
        toast.success("Screenshot saved successfully");
        router.push("/home");
      } else {
        toast.error(`Failed to create issue: ${issueResult.error}`);
      }

      setSaving(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("An error occurred while saving");
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/home");
  };

  const renderShape = (shape: any) => {
    const commonProps = {
      key: shape.id,
      id: shape.id,
      onClick: () => setSelectedId(shape.id),
      onTap: () => setSelectedId(shape.id),
      draggable: tool === "select",
      onDragEnd: (e: any) => {
        const newShapes = shapes.map((s) => {
          if (s.id === shape.id) {
            return {
              ...s,
              x: e.target.x(),
              y: e.target.y(),
            };
          }
          return s;
        });
        setShapes(newShapes);
      },
    };

    switch (shape.type) {
      case "line":
        return Line && <Line {...commonProps} {...shape} />;
      case "arrow":
        return Arrow && <Arrow {...commonProps} {...shape} />;
      case "rect":
        return Rect && <Rect {...commonProps} {...shape} />;
      case "circle":
        return Circle && <Circle {...commonProps} {...shape} />;
      case "text":
        return (
          Text && (
            <Text
              {...commonProps}
              {...shape}
              onDblClick={() => handleTextDblClick(shape.id)}
              onDblTap={() => handleTextDblClick(shape.id)}
            />
          )
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Annotate Screenshot - SnapFlow</title>
      </Head>
      <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left: Tools */}
            <div className="flex items-center gap-3">
              {/* Tool Group */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                <Button
                  variant={tool === "select" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setTool("select")}
                  title="Select (V)"
                  className="h-9 w-9 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                  </svg>
                </Button>
                <Button
                  variant={tool === "pen" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setTool("pen")}
                  title="Pen (P)"
                  className="h-9 w-9 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Button>
                <Button
                  variant={tool === "arrow" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setTool("arrow")}
                  title="Arrow (A)"
                  className="h-9 w-9 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Button>
                <Button
                  variant={tool === "rectangle" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setTool("rectangle")}
                  title="Rectangle (R)"
                  className="h-9 w-9 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                  </svg>
                </Button>
                <Button
                  variant={tool === "circle" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setTool("circle")}
                  title="Circle (C)"
                  className="h-9 w-9 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Button>
                <Button
                  variant={tool === "text" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setTool("text")}
                  title="Text (T)"
                  className="h-9 w-9 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </Button>
              </div>

              <div className="h-6 w-px bg-gray-700" />

              {/* Color */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 uppercase font-medium">Color</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-9 h-9 rounded border border-gray-700 cursor-pointer bg-gray-800"
                />
              </div>

              {/* Width */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 uppercase font-medium">Width</span>
                <select
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="h-9 px-3 rounded border border-gray-700 bg-gray-800 text-gray-100 text-sm"
                >
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={5}>5px</option>
                  <option value={8}>8px</option>
                </select>
              </div>

              {/* Fill */}
              {(tool === "rectangle" || tool === "circle") && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 uppercase font-medium">Fill</span>
                  <select
                    value={fillOpacity}
                    onChange={(e) => setFillOpacity(Number(e.target.value))}
                    className="h-9 px-3 rounded border border-gray-700 bg-gray-800 text-gray-100 text-sm"
                  >
                    <option value={0}>None</option>
                    <option value={0.2}>20%</option>
                    <option value={0.5}>50%</option>
                    <option value={1}>100%</option>
                  </select>
                </div>
              )}

              <div className="h-6 w-px bg-gray-700" />

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={shapes.length === 0}
                  title="Undo (Ctrl+Z)"
                  className="h-9 w-9 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={!selectedId}
                  title="Delete (Del)"
                  className="h-9 w-9 p-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={shapes.length === 0}
                  title="Clear All"
                  className="h-9 w-9 p-0 hover:bg-red-500/10 hover:text-red-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>

            {/* Right: Save/Cancel */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel} className="h-9">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={saving} className="h-9">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas Area - Full height */}
        <div className="flex-1 overflow-hidden bg-gray-950" ref={containerRef}>
          <div className="w-full h-full flex items-center justify-center p-4">
            {screenshot && Stage && Layer && image ? (
              <div className="shadow-2xl">
                <Stage
                  ref={stageRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                  className="border border-gray-800 rounded-lg"
                >
                  <Layer>
                    {KonvaImage && (
                      <KonvaImage
                        image={image}
                        width={dimensions.width}
                        height={dimensions.height}
                      />
                    )}

                    {shapes.map((shape) => renderShape(shape))}
                    {currentShape && renderShape(currentShape)}

                    {Transformer && selectedId && tool === "select" && (
                      <Transformer
                        ref={(node: any) => {
                          if (node) {
                            const stage = node.getStage();
                            const selectedNode = stage.findOne(`#${selectedId}`);
                            if (selectedNode) {
                              node.nodes([selectedNode]);
                              node.getLayer().batchDraw();
                            }
                          }
                        }}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-medium">Waiting for screenshot...</p>
                  <p className="text-gray-600 text-sm">Capture a screenshot to start annotating</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Panel - Details */}
        <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (required)"
                className="w-full h-8 text-sm"
              />
            </div>
            <div className="flex-1">
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Text Edit Dialog */}
        {editingTextId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-96 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Edit Text</h3>
              <Input
                type="text"
                value={editingTextValue}
                onChange={(e) => setEditingTextValue(e.target.value)}
                placeholder="Enter text"
                className="w-full mb-4"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTextEditSave();
                  } else if (e.key === "Escape") {
                    handleTextEditCancel();
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleTextEditCancel}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleTextEditSave}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
