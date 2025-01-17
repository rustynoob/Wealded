import {Vector, pointInPolygon} from './vector.js';
import {Component, System, debug, TransformComponent} from './engine.js';

/*
 *UI system
 */

export class UIComponent extends Component{
  constructor(callbacks = []){
    super("ui");
    this.events = new Map();
    this.mouse = {X:0,y:0};
    for(const callback of callbacks){
      this.regesterCallback(callback.event,callback.callback);
    }
  }
  regesterCallback(type, callback){
    const e = {
      event:false,
      callback: callback
    }
    this.events.set(type,e)
  }
  draw(ctx,transform, dt){
    ctx.save();
    ctx.rotate(transform.rotation);
    ctx.translate(transform.x ,  transform.y );
    ctx.scale(1/transform.scale, 1/transform.scale);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.mouse.x+10, this.mouse.y);
    ctx.lineTo(this.mouse.x, this.mouse.y);
    ctx.lineTo(this.mouse.x, this.mouse.y+10);
    ctx.stroke();

    ctx.restore();
  }
}


export class UISystem extends System{
 constructor(events = []) {
   super("ui");
    this.runPaused = true;
    this.canvas = document.getElementById("canvas");;
    this.ctx = canvas.getContext("2d");
    this.ongoingEvents = new Map();
    this.cursorPosition = new Vector({x:0,y:0})
    this.start();
    this.inputs = new Map();
    for(const event of events){
      this.inputs.set(event.key,event.id);
    }
  }
  regesterEvents(key, identifier){
    for(const event of events){
      this.inputs.set(key,identifier);
    }
  }

  regesterEvent(key, identifier){
    this.inputs.set(key,identifier);
  }

  keyDownHandler(event){
    const touch = {
      action: "down",
      type: this.inputs.get(event.code)
    };
    this.ongoingEvents.set(touch.type, touch);
  }

  keyUpHandler(event){
    const touch = {
      action: "up",
      type: this.inputs.get(event.code)
    };
    this.ongoingEvents.set(touch.type, touch);
  }
// this will fix it but breaks multi touch
/*
 * touch
 * {pageX:,pageY:,id:,state:(start,move,end,cancle)}
 *
 */
  pointerDownHandler(event) {
    const touch = {
      x: event.pageX,
      y: event.pageY,
      id: event.pointerId,
      action: "down",
      type: "pointer"
    };
    this.ongoingEvents.set(touch.type, touch);
    event.preventDefault();
  }

  pointerMoveHandler(event) {
    /*
    const touch = this.ongoingEvents.get(event.pointerId);

    // Event was not started
    if (!touch) {
      return;
    }
*/
     if(this.ongoingEvents.has("pointer")){
       return;
    }
    const touch = {
      x: event.pageX,
      y: event.pageY,
      id: event.pointerId,
      action: "move",
      type: "pointer"
    };
    this.ongoingEvents.set(touch.type, touch);// this will overwrite the start event
    event.preventDefault();
  }


  pointerUpHandler(event) {
    /*
    const touch = this.ongoingEvents.get(event.pointerId);

    if (!touch) {
      console.error(`End: Could not find touch ${event.pointerId}`);
      return;
    }
*/
    const touch = {
      x: event.pageX,
      y: event.pageY,
      id: event.pointerId,
      action: "up",
      type: "pointer"
    };
    this.ongoingEvents.set(touch.type, touch);// this will overwrite the start event
     event.preventDefault();
  }
  pointerCancelHandler(event) {
  event.preventDefault();

  }

  update(entities) {

    // get the camera transforms
    //for each camera
    //put all the camers into a map with the key as the id
    // store the transform of each camera minus half the width or height
    let cameras = [];
    for (const entity of entities) {
      if(entity.hasComponent("camera") && entity.hasComponent("transform")){
        const camera = entity.getComponent("camera");
        const transform = entity.getComponent("transform");
       // const tempTransform = new TransformComponent(camera.x,camera.y,camera.z,0,camera.zoom);
        cameras.push({
          id: camera.id,
          transform: transform,
          component: camera
        });
      }
    }

    // sort the cameras and entities by z depth
    cameras = [...cameras].sort((a, b) => {
      const transformA = a.transform;
      const transformB = b.transform;
      return transformB.z - transformA.z;
    });
    const sortedEntities = [...entities].filter(entity => entity.hasComponent("ui")).sort((a, b) => {
      const transformA = a.getComponent("transform");
      const transformB = b.getComponent("transform");

      return (transformB?transformB.z:0) - (transformA?transformA.z:0);
    });
    //const ctx = this.canvas.getContext("2d");
    // Update the input state of all entities with a UIComponent

    for (const entity of sortedEntities) {
        const ui = entity.getComponent("ui");
        for(const input of this.ongoingEvents.values()){
          let regesteredEvent = ui.events.get(input.type);
          if(regesteredEvent){
            regesteredEvent.event = input;
            if(input.type == "pointer"){
              if(!entity.hasComponent("transform") || !entity.hasComponent("collision")){
                console.log(entity.name+" has registered pointer event but is missing transform or collision components.");
                continue;
              }
              else{
                const transform = entity.getComponent("transform");
                const polygon = entity.getComponent("collision").vertices;
                for(const camera of cameras){
                  if(entity.hasComponent(camera.id)){
                    const pointer = new Vector(input);
                    const screenSpace = new TransformComponent(camera.component.x,camera.component.y,camera.component.z,camera.component.rotation,camera.component.zoom);
                    const cameraSpace = camera.transform;
                    const mouseCamera = screenSpace.transformOut(pointer);
                    const mouseGlobal = cameraSpace.transformOut(mouseCamera);
                    const mouseEntity = transform.transformOut(mouseGlobal);
                    const scaledInput = {
                      x: mouseGlobal.x,
                      y: mouseGlobal.y,
                      id: input.id,
                      action: input.action,
                      type: input.type
                    };
                    ui.mouse = mouseEntity;
                    if(input.action == "move" || input.action == "up"){
                      if(regesteredEvent.callback){
                        regesteredEvent.callback(entity,scaledInput);
                      }
                    }
                    else {
                      if(pointInPolygon(mouseEntity, polygon)){
                        // if event has callback
                        if(regesteredEvent.callback){
                          regesteredEvent.callback(entity, scaledInput);
                        }
                        // consume event
                        this.ongoingEvents.delete(input.type);
                      }
                    }
                  }
                }
              }
            }
            else{// this is a non pointer based event
              if(regesteredEvent.callback){
                  regesteredEvent.callback(entity,input);
              }
            }
          }
        }
    }
    // we need to make sure now that we are done that all unused events are cleared.
    this.ongoingEvents.clear();

  }


  start() {
    // Listen for keydown, keyup, touchstart, touchmove, and touchend events
    window.addEventListener("keydown", this.keyDownHandler.bind(this));
    window.addEventListener("keyup", this.keyUpHandler.bind(this));
    window.addEventListener("pointerdown", this.pointerDownHandler.bind(this),false);
    window.addEventListener("pointermove", this.pointerMoveHandler.bind(this), false);
    window.addEventListener("pointerup", this.pointerUpHandler.bind(this), false);
    window.addEventListener("pointercancel", this.pointerCancelHandler.bind(this), false);
    document.addEventListener("keydown", (event) => {
      if (event.code === "ArrowUp" || event.code === "ArrowDown" || event.code === "ArrowLeft" || event.code === "ArrowRight") {
        event.preventDefault();
      }
    });
    document.addEventListener('contextmenu',event => event.preventDefault());
  }
  //this function is never called
  stop() {
    // Stop listening for keydown, keyup, touchstart, touchmove, and touchend events
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
    window.removeEventListener("pointerdown", this.pointerDownHandler);
    window.removeEventListener("pointermove", this.pointerMoveHandler);
    window.removeEventListener("pointerup", this.pointerUpHandler);
    window.removeEventListener("pointercancel", this.pointerCancelHandler);
  }
}



