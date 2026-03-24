/*eslint no-unused-vars: 0*/

import FabricCanvasTool from "./fabrictool";
import { linearDistance } from "./utils";

const fabric = require("fabric").fabric;
const geometric = require("geometric");

class Polygon extends FabricCanvasTool {
  activeLine;
  activeShape;
  canvas = this._canvas;
  lineArray = [];
  pointArray = [];
  drawMode = true;

  configureCanvas(props) {
    let canvas = this._canvas;
    canvas.isDrawingMode = canvas.selection = false;
    this._width = props.lineWidth;
    this._color = props.lineColor;
    this._fill = props.fillColor;
    this.count = 1;
    this.objectAdd = false;
  }

  Point(x, y) {
    this.x = x;
    this.y = y;
  }

  doMouseDown(options, props) {
    if (this.drawMode) {
      const { notificationShow, addROIDefaultName , removeColorInDefaultShapeColors} = props;
      let roiTypes = ["rect", "ellipse", "polygon"];
      let objects = this._canvas.getObjects();
      objects = objects.filter(
        (object) => object.id !== undefined && roiTypes.includes(object.type) && object.id !== "trackingArea"
      );
      if (objects.length >= 5) {
        notificationShow();
        console.log(
          `Maximum five shapes allowed `,
          "color:blue; font-weight:bold;",
          "color:black;"
        );
        this.objectAdd = false;
        return;
      }
      if (
        options.target &&
        this.pointArray[0] &&
        options.target.id === this.pointArray[0].id
      ) {
        this.objectAdd = true;
        this.generatePolygon(this.pointArray, props);
        removeColorInDefaultShapeColors(props.defaultShapeColors);
        addROIDefaultName(props.roiDefaultNames);
      } else {
        this.addPoint(options, props);
      }
    }

    var evt = options.e;
    if (evt.altKey === true) {
      this.isDragging = true;
      this.selection = false;
      this.lastPosX = evt.clientX;
      this.lastPosY = evt.clientY;
    }
  }

  addPoint = (options, props) => {
    let canvas = this._canvas;
    let boundaryObject = canvas.getObjects().find(ob => ob.id === "trackingArea");
    if(!boundaryObject) boundaryObject = this.getboudaryCoords();
    
    const pointOption = {
      id: new Date().getTime(),
      radius: 2,
      fill: "#ffffff",
      stroke: "#333333",
      strokeWidth: 0.5,
      left: options.e.layerX / canvas.getZoom(),
      top: options.e.layerY / canvas.getZoom(),
      selectable: false,
      hasBorders: false,
      hasControls: false,
      originX: "center",
      originY: "center",
      objectCaching: false,
    };
    const point = new fabric.Circle(pointOption);
    if(boundaryObject && (point.left > (boundaryObject.width * boundaryObject.scaleX) + boundaryObject.left || point.top > (boundaryObject.height * boundaryObject.scaleY) + boundaryObject.top || point.left < boundaryObject.left || point.top < boundaryObject.top)){
      return;
    }

    if (this.pointArray.length === 0) {
      // fill first point with red color
      point.set({
        fill: "red",
      });
    }

    const linePoints = [
      options.e.layerX / canvas.getZoom(),
      options.e.layerY / canvas.getZoom(),
      options.e.layerX / canvas.getZoom(),
      options.e.layerY / canvas.getZoom(),
    ];
    const lineOption = {
      strokeWidth: 2,
      fill: "#999999",
      stroke: "#999999",
      originX: "center",
      originY: "center",
      selectable: false,
      hasBorders: false,
      hasControls: false,
      evented: false,
      objectCaching: false,
    };
    const line = new fabric.Line(linePoints, lineOption);
    line.class = "line";

    if (this.activeShape) {
      const pos = canvas.getPointer(options.e);
      const points = this.activeShape.get("points");
      points.push({
        x: pos.x,
        y: pos.y,
      });
      const polygon = new fabric.Polygon(points, {
        stroke: "#333333",
        strokeWidth: 1,
        fill: this._fill,
        opacity: 0.3,
        selectable: false,
        hasBorders: false,
        hasControls: false,
        evented: false,
        objectCaching: false,
        visible: false
      });
      canvas.remove(this.activeShape);
      canvas.add(polygon);
      this.activeShape = polygon;
      canvas.renderAll();
    } else {
      const polyPoint = [
        {
          x: options.e.layerX / canvas.getZoom(),
          y: options.e.layerY / canvas.getZoom(),
        },
      ];
      const polygon = new fabric.Polygon(polyPoint, {
        stroke: "#333333",
        strokeWidth: 1,
        fill: "#cccccc",
        opacity: 0.3,
        selectable: false,
        hasBorders: false,
        hasControls: false,
        evented: false,
        objectCaching: false,
        visible: false
      });
      this.activeShape = polygon;
      canvas.add(polygon);
    }

    this.activeLine = line;
    this.pointArray.push(point);
    this.lineArray.push(line);

    canvas.add(line);
    canvas.add(point);
  };

  doMouseMove(options, props) {
    //if (!this.isDown) return;
    let canvas = this._canvas;
    let pointer = canvas.getPointer(options.e);
    let boundary = props.getboudaryCoords();
    if(boundary && (pointer.y > (boundary.height * boundary.scaleY) + boundary.top  || pointer.x > (boundary.width * boundary.scaleX) + boundary.left  || pointer.x < boundary.left || pointer.y < boundary.top)){
        
      return;
    }   
    if (this.isDragging) {
      var e = options.e;
      let obj = e.target;
      this.viewportTransform[4] += e.clientX - this.lastPosX;
      this.viewportTransform[5] += e.clientY - this.lastPosY;
      canvas.requestRenderAll();
      this.lastPosX = e.clientX;
      this.lastPosY = e.clientY;
    }
    if (this.drawMode) {
      if (this.activeLine && this.activeLine.class === "line") {
        const pointer = this.canvas.getPointer(options.e);
        this.activeLine.set({
          x2: pointer.x,
          y2: pointer.y,
        });
        const points = this.activeShape.get("points");
        points[this.pointArray.length] = {
          x: pointer.x,
          y: pointer.y,
        };
        this.activeShape.set({
          points,
        });
      }
      canvas.renderAll();
    }
  }

  doMouseUp(o, props) {
    this.isDown = false;
    let canvas = this._canvas;
    canvas.selection = true;
    this.isDragging = false;
    this.selection = true;
    this.drawMode = true;
    const { onShapeAdded } = props;
    // if(this.objectAdd)
    //   onShapeAdded();
  }

  generatePolygon = (pointArray, props) => {
    let canvas = this._canvas;
    let objects = canvas.getObjects();
    let roiTypes = ["rect", "ellipse", "polygon"];
    let findIdForObject = objects.filter(
      (object) => object.id !== undefined && roiTypes.includes(object.type)
    );
    // let name = `ROI#${findIdForObject.length + 1}`;
    let name = props.roiDefaultNames[0];
    let defaultName = props.roiDefaultNames[0];
    let points = [];
    // collect points and remove them from canvas
    for (const point of pointArray) {
      points.push({
        x: point.left,
        y: point.top,
      });
      canvas.remove(point);
    }

    // // remove lines from canvas
    for (const line of this.lineArray) {
      canvas.remove(line);
    }

    // remove selected Shape and Line
    canvas.remove(this.activeShape).remove(this.activeLine);

    // create polygon from collected points
    const polygon = new fabric.Polygon(points, {
      id: new Date().getTime(),
      fill: this._fill,
      strokeWidth: this._width,
      stroke: props.defaultShapeColors[0],
      transparentCorners: false,
      name: name,
      defaultName: defaultName,
      selectable: false,
      evented: false,
      enable: true,
      description: "",
      strokeUniform: true,
    });
    canvas.add(polygon);
    this.toggleDrawPolygon();
    this.editPolygon(polygon, props);
    polygon.setCoords();
    if(!this.checkForMinDistance(polygon, props)){ 
      props.notificationShow("Zone size should be bigger then 100px");
      return;
    }
    props.checkForOverlap();
    props.onShapeAdded();
  };

  toggleDrawPolygon = () => {
    let canvas = this._canvas;
    if (this.drawMode) {
      // stop draw mode
      this.activeLine = null;
      this.activeShape = null;
      this.lineArray = [];
      this.pointArray = [];
      this.canvas.selection = true;
      // this.drawMode = false;
    } else {
      // start draw mode
      canvas.selection = false;
      this.drawMode = true;
    }
  };

  editPolygon = (polygon, props) => {
    let canvas = this._canvas;
    let activeObject = canvas.getActiveObject();
    if (!activeObject) {
      activeObject = polygon;
      // canvas.setActiveObject(activeObject);
    }

    activeObject.edit = true;
    activeObject.objectCaching = false;

    const lastControl = activeObject.points.length - 1;
    activeObject.cornerStyle = "circle";
    activeObject.controls = activeObject.points.reduce((acc, point, index) => {
      // this.pointIndex = index;
      acc["p" + index] = new fabric.Control({
        pointIndex: index,
        positionHandler: (dim, finalMatrix, fabricObject) => {
          var x = fabricObject.points[index].x - fabricObject.pathOffset.x,
            y = fabricObject.points[index].y - fabricObject.pathOffset.y;
          return fabric.util.transformPoint(
            { x: x, y: y },
            fabric.util.multiplyTransformMatrices(
              fabricObject.canvas.viewportTransform,
              fabricObject.calcTransformMatrix()
            )
          );
        },
        actionHandler: this.anchorWrapper(
          index > 0 ? index - 1 : lastControl,
          this.actionHandler
        ),
        actionName: "modifyPolygon",
      });
      return acc;
    }, {});

    activeObject.hasBorders = true;
    activeObject.setCoords();
    canvas.requestRenderAll();
  };

  polygonPositionHandler = (dim, finalMatrix, fabricObject) => {
    const transformPoint = {
      x: fabricObject.points[this.pointIndex].x - fabricObject.pathOffset.x,
      y: fabricObject.points[this.pointIndex].y - fabricObject.pathOffset.y,
    };
    return fabric.util.transformPoint(
      transformPoint,
      fabricObject.calcTransformMatrix()
    );
  };

  anchorWrapper = (anchorIndex, fn) => {
    return (eventData, transform, x, y) => {
      var fabricObject = transform.target,
        absolutePoint = fabric.util.transformPoint(
          {
            x: fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x,
            y: fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y,
          },
          fabricObject.calcTransformMatrix()
        ),
        actionPerformed = fn(eventData, transform, x, y),
        newDim = fabricObject._setPositionDimensions({}),
        polygonBaseSize = this.getObjectSizeWithStroke(fabricObject),
        newX =
          (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x) /
          polygonBaseSize.x,
        newY =
          (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y) /
          polygonBaseSize.y;

      fabricObject.setPositionByOrigin(absolutePoint, newX + 0.5, newY + 0.5);
      return actionPerformed;
    };
  };

  actionHandler = (eventData, transform, x, y) => {
    let canvas = this._canvas;
    let boundary = canvas.getObjects().find(ob => ob.id === "trackingArea");
    if(!boundary) boundary = this.getboudaryCoords();
    var polygon = transform.target,
      currentControl = polygon.controls[polygon.__corner],
      mouseLocalPosition = polygon.toLocalPoint(
        new fabric.Point(x, y),
        "center",
        "center"
      ),
      polygonBaseSize = this.getObjectSizeWithStroke(polygon),
      size = polygon._getTransformedDimensions(0, 0),
      finalPointPosition = {
        x:
          (mouseLocalPosition.x * polygonBaseSize.x) / size.x +
          polygon.pathOffset.x,
        y:
          (mouseLocalPosition.y * polygonBaseSize.y) / size.y +
          polygon.pathOffset.y,
      };
      if(boundary && (y > (boundary.height * boundary.scaleY) + boundary.top  || x > (boundary.width * boundary.scaleX) + boundary.left  || x < boundary.left || y < boundary.top)){
        
        return false;
      }
    let tempPolygon =  JSON.parse(JSON.stringify(polygon));
    tempPolygon.points[currentControl.pointIndex] = finalPointPosition;
    if(!this.checkForMinDistance(tempPolygon)){
      polygon.points[currentControl.pointIndex]  = polygon.points[currentControl.pointIndex];
      return true;
    } 
    polygon.points[currentControl.pointIndex] = finalPointPosition;
    return true;
  };

  checkWithinBoundary = (finalPointPosition) => {
    let canvas = this._canvas;
    let boundary = canvas.getObjects().find(ob => ob.id === "trackingArea");
    if (boundary && (finalPointPosition.y > boundary.height + boundary.top || finalPointPosition.x > boundary.width + boundary.left || finalPointPosition.x < boundary.left || finalPointPosition.y < boundary.top)) {
      return false;
    }
    return true
  }

  getObjectSizeWithStroke = (object) => {
    var stroke = new fabric.Point(
      object.strokeUniform ? 1 / object.scaleX : 1,
      object.strokeUniform ? 1 / object.scaleY : 1
    ).multiply(object.strokeWidth);
    return new fabric.Point(object.width + stroke.x, object.height + stroke.y);
  };

  checkForMinDistance = (polygon, props) =>{
    const minArea = 100;
    let totalArea = geometric.polygonArea(this.getPolygonCoords(polygon))
    if (totalArea < minArea) {
        if(props)
        props.setSelected(polygon, true);
        return false;
    }
    return true;
  }

  getboudaryCoords = () =>{
    let canvas = this._canvas;
    let boundary = canvas.getObjects().find(ob => ob.id === "trackingArea");
    let cords = {};
    if(!boundary){
      cords["width"] = canvas.getWidth() - 1;
      cords["height"] = canvas.getHeight() - 1;
      cords["left"] = 0;
      cords["top"] = 0;
      cords["scaleX"] = 1;
      cords["scaleY"] = 1;
    }else{
      cords["width"] = boundary.width * boundary.scaleX;
      cords["height"] = boundary.height * boundary.scaleY;
      cords["left"] = boundary.left;
      cords["top"] = boundary.top;
      cords["scaleX"] = boundary.scaleX;
      cords["scaleY"] = boundary.scaleY;
    }
    return cords;
  }

  getPolygonCoords =(obj) => {
    const coords = [];
    for (let i = 0; i < obj.points.length; i++) {
      const point = obj.points[i];
      const x = point.x;
      const y = point.y;
      coords.push([x, y]);
    }
    return coords;
  }

}

export default Polygon;
