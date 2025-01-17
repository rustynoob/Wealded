import {App, phone} from './phone.js';
import {SoundEffectSystem} from './engine/soundEffects.js';
import {SpriteComponent,RotatedSpriteComponent, ScaledSpriteComponent, TiledSpriteComponent,AnimatedSpriteComponent, SquareComponent,CircleComponent, RenderSystem, TextComponent, WordWrappedTextComponent, LineComponent, PolygonComponent, CameraComponent} from './engine/graphics.js';
import {Deccorator, Widget, WidgetList, GUIComponent, ScrollingPanel, Panel,ScrollBarWidget,FitWidget, FitWidgetList} from "./engine/gui.js";
import {Vector, pointInPolygon} from './engine/vector.js';


class Fader extends ScrollingPanel{
    constructor(sound,x,y,width = 120, height = 40){
        super(x,y,width,height,[])
        this.sound = sound;
        this.incriment = 0.1;
        this.trackWidth = 2;
        this.faderLength = 10;

        this.trackPolygon = [{x:0,y:this.height/2-this.trackWidth},{x:width-this.faderLength,y:this.height/2-this.trackWidth},{x:width-this.faderLength,y:height/2+this.trackWidth},{x:0,y:height/2+this.trackWidth}];


        this.faderPolygon = [{x:0,y:0},{x:this.faderLength,y:0},{x:this.faderLength,y:this.height},{x:0,y:this.height}];
        this.fader =  new Widget(width-this.faderLength,0,this.faderPolygon,this.setVolume.bind(this),[]);
        this.fader.downCallback = this.setVolume.bind(this);

        this.faderBar = new Panel({x:0,y:0},
            [{x:0,y:0},{x:(this.width*2)-this.faderLength,y:0},{x:(this.width*2)-this.faderLength,y:this.height},{x:0,y:this.height}],[
            new Widget(0,0,this.trackPolygon,this.volumeDown.bind(this),[],"black","transparent"),

            new Widget(width,0,this.trackPolygon,this.volumeUp.bind(this),
            [],"black","transparent"),this.fader
        ],"transparent","transparent")
        this.content = [this.faderBar];
        this.scroll.x = this.width - (this.width * this.sound.volume);
        this.scroll.y = 0;
    }
    volumeDown(){
        this.sound.volume = this.sound.volume < this.incriment? 0: this.sound.volume - this.incriment;
        this.setScroll(this.width - (this.width*this.sound.volume),0);
        this.sound.dirty = true;
        console.log(`${this.sound.volume}`);
    }

    volumeUp(){
        this.sound.volume = this.sound.volume + this.incriment > 1 ? 1: this.sound.volume + this.incriment;
        this.setScroll(this.width - (this.width*this.sound.volume),0);
        this.sound.dirty = true;
        console.log(`${this.sound.volume}`);
    }

    setVolume(point, event){
        this.bindScroll(point,event);

    }
    bindScroll(point,event){
        super.bindScroll(point, event);
        this.sound.dirty = true;
        this.sound.volume = 1-(this.scroll.x/this.width);
        console.log(`volume: ${this.sound.volume}`);
    }
}


class Channel extends Panel{
    constructor(sound ,player,width = 280,height = 40){
        super({x:3,y:0},[{x:0,y:0},{x:274,y:0},{x:274,y:40},{x:0,y:40}], null, "rgb(123,132,123)", "rgb(23,32,23)", 1,true);
         this.width = width;
        this.height = height;
        this.player = player;
        this.sound = sound;

        this.nametag = new Deccorator(40,26,new WordWrappedTextComponent(this.sound.type, "arial", 16, "black", "center", 0, 0, 80));
        this.testButton = new Widget(75,0,
                                     [{x:4,y:6},{x:8,y:4},{x:36,y:18},{x:36,y:22},{x:8,y:36},{x:4,y:34}],
                                     this.test.bind(this),[new Deccorator(0,0,new ScaledSpriteComponent('./graphics/icons/play.png',0,0,40,40,40,40))
        ],"transparent","transparent")

        this.fader = new Fader(this.sound,115,10,120,20);
        this.muteIndicator = new Deccorator(0,0,new PolygonComponent([{x:36,y:4},{x:4,y:36}], "transparent", "red", 1));
        this.muteIndicator.visible = false;
        this.muteButton = new Widget(
            235,0,
            [{x:4,y:10},{x:12,y:10},{x:22,y:4},{x:32,y:4},{x:36,y:10},{x:38,y:20},{x:36,y:30},{x:32,y:36},{x:22,y:36},{x:12,y:30},{x:4,y:30}],
            this.toggleMute.bind(this),[
                new Deccorator(0,0,new ScaledSpriteComponent('./graphics/icons/sound.png',0,0,40,40,40,40)),
                this.muteIndicator
            ]
       ,"transparent","transparent");
        this.content = [this.nametag, this.testButton, this.fader, this.muteButton];
    }

    test(){
        this.player.playSoundEffect(this.sound.type);
        this.dirty = true;
    }
    toggleMute(){
        this.sound.muted = !this.sound.muted;
        this.muteIndicator.visible = this.sound.muted;
        this.dirty = true;
    }
}

function noop(){}

export class Mixer extends App{
    constructor(phone, sounds, music){
        super('./graphics/icons/sound.png',"Sound",null);
        this.sounds = sounds;
        this.music = music;
        this.music.type = "Music";
        phone.addApp(this);
        this.setAsShortcut();
        this.faderStack = new FitWidgetList(0, 0, 3, []);
        this.masterFader = new Channel(this.sounds,this.sounds);
        this.masterFader.content[1].visible = false;
        this.masterFader.content[1].callback = noop;
        this.masterFader.nametag.deccoration.content = "Sound Effects";
        this.masterFader.nametag.position.x = 56;
        this.masterFader.nametag.deccoration.width = 120;
        this.masterFader.background = "grey";
        this.musicFader = new Channel(this.music,this.music);
        this.musicFader.background = "grey";
        this.musicFader.content[1].visible = false;
        this.musicFader.content[1].callback = noop;
        this.musicFader.nametag.position.x = 56;


        this.content = [new Panel({x:0,y:0},[{x:0,y:0},{x:280,y:0},{x:280,y:450},{x:0,y:450}],[
                new Deccorator(140,50,new WordWrappedTextComponent ("Mixer", "arial", 24, "white", "center", 0, 0, 200)),
                new Deccorator(40,20,this.icon),
                new Deccorator(200,20,new SpriteComponent('./graphics/icons/music.png')),
                new ScrollingPanel(0, 82, 280, 310, [this.faderStack])
            ],"darkred"),
            new FitWidgetList(0,-342,3,[this.musicFader, this.masterFader])

        ];
        for(const effect of this.sounds.effects.values()){
            this.faderStack.addWidget(new Channel(effect,this.sounds));
        }
    }
    init(){

    }



}
