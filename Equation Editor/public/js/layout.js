// Last updated November 2010 by Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// This is a self-executing function that I added only to stop this
// new script from interfering with the old one. It's a good idea in general, but not
// something I wanted to go over during this tutorial



// holds all our boxes
var boxes2 = [];

// New, holds the 8 tiny boxes that will be our selection handles
// the selection handles will be in this order:
// 0  1  2
// 3     4
// 5  6  7
var selectionHandles = [];

// Hold canvas information
var canvas;
var ctx;
var WIDTH;
var HEIGHT;
var INTERVAL = 20;  // how often, in milliseconds, we check to see if a redraw is needed

var isDrag = false;
var isResizeDrag = false;
var expectResize = -1; // New, will save the # of the selection handle if the mouse is over one.
var mx, my; // mouse coordinates

// when set to true, the canvas will redraw everything
// invalidate() just sets this to false right now
// we want to call invalidate() whenever we make a change
var canvasValid = false;

// The node (if any) being selected.
// If in the future we want to select multiple objects, this will get turned into an array
var mySel = null;

// The selection color and width. Right now we have a red selection with a small width
var mySelColor = '#CC0000';
var mySelWidth = 2;
var mySelBoxColor = 'darkred'; // New for selection boxes
var mySelBoxSize = 6;

// we use a fake canvas to draw individual shapes for selection testing
var ghostcanvas;
var gctx; // fake canvas context

// since we can drag from anywhere in a node
// instead of just its x/y corner, we need to save
// the offset of the mouse when we start dragging.
var offsetx, offsety;

// Padding and border style widths for mouse offsets
var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;




// Box object to hold data
function Box2() {
  this.x = 0;
  this.y = 0;
  this.w = 1; // default width and height?
  this.h = 1;
  this.fill = '#444444';
}

// New methods on the Box class
Box2.prototype = {
  // we used to have a solo draw function
  // but now each box is responsible for its own drawing
  // mainDraw() will call this with the normal canvas
  // myDown will call this with the ghost canvas with 'black'
  draw: function (context, optionalColor) {
    if (context === gctx) {
      context.fillStyle = 'black'; // always want black for the ghost canvas
    } else {
      context.fillStyle = this.fill;
      if (this.getSvg == null) {
      context.strokeStyle = 'green';
      }
      else{
        context.strokeStyle = 'rgba(0,0,0,0)';
      }
    }

    // We can skip the drawing of elements that have moved off the screen:
    if (this.x > WIDTH || this.y > HEIGHT) return;
    if (this.x + this.w < 0 || this.y + this.h < 0) return;

    context.fillRect(this.x, this.y, this.w, this.h);
    context.strokeRect(this.x, this.y, this.w, this.h);
    // draw selection
    // this is a stroke along the box and also 8 new selection handles
    if (mySel === this) {
      context.strokeStyle = mySelColor;
      if (this.getSvg == null) {
        context.strokeStyle = mySelColor;
        }
        else{
          context.strokeStyle = 'rgba(0,0,0,0.2)';
        }
      context.lineWidth = mySelWidth;
      context.strokeRect(this.x, this.y, this.w, this.h);

      // draw the boxes

      var half = mySelBoxSize / 2;

      // 0  1  2
      // 3     4
      // 5  6  7

      // top left, middle, right
      selectionHandles[0].x = this.x - half;
      selectionHandles[0].y = this.y - half;

      selectionHandles[1].x = this.x + this.w / 2 - half;
      selectionHandles[1].y = this.y - half;

      selectionHandles[2].x = this.x + this.w - half;
      selectionHandles[2].y = this.y - half;

      //middle left
      selectionHandles[3].x = this.x - half;
      selectionHandles[3].y = this.y + this.h / 2 - half;

      //middle right
      selectionHandles[4].x = this.x + this.w - half;
      selectionHandles[4].y = this.y + this.h / 2 - half;

      //bottom left, middle, right
      selectionHandles[6].x = this.x + this.w / 2 - half;
      selectionHandles[6].y = this.y + this.h - half;

      selectionHandles[5].x = this.x - half;
      selectionHandles[5].y = this.y + this.h - half;

      selectionHandles[7].x = this.x + this.w - half;
      selectionHandles[7].y = this.y + this.h - half;


      context.fillStyle = mySelBoxColor;
      for (var i = 0; i < 8; i++) {
        var cur = selectionHandles[i];
        context.fillRect(cur.x, cur.y, mySelBoxSize, mySelBoxSize);
      }
    }
    if (this.getSvg != null) {
      drawInlineSVG(this.getSvg, this.x, this.y,true);
    }
  } // end draw

}

//Initialize a new Box, add it, and invalidate the canvas
function addRect(x, y, w, h, fill) {
  var rect = new Box2;
  rect.x = x;
  rect.y = y;
  rect.w = w
  rect.h = h;
  rect.fill = fill;
  boxes2.push(rect);
  invalidate();
}

// initialize our canvas, add a ghost canvas, set draw loop
// then add everything we want to intially exist on the canvas
function init2() {
  canvas = document.getElementById('canvas2');
  HEIGHT = canvas.height;
  WIDTH = canvas.width;
  ctx = canvas.getContext('2d');
  ghostcanvas = document.createElement('canvas');
  ghostcanvas.height = HEIGHT;
  ghostcanvas.width = WIDTH;
  gctx = ghostcanvas.getContext('2d');

  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.onselectstart = function () { return false; }

  // fixes mouse co-ordinate problems when there's a border or padding
  // see getMouse for more detail
  if (document.defaultView && document.defaultView.getComputedStyle) {
    stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
    stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
    styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
    styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
  }

  // make mainDraw() fire every INTERVAL milliseconds
  setInterval(mainDraw, INTERVAL);

  // set our events. Up and down are for dragging,
  // double click is for making new boxes
  canvas.onmousedown = myDown;
  canvas.onmouseup = myUp;
  canvas.ondblclick = myDblClick;
  canvas.onmousemove = myMove;

  // set up the selection handle boxes
  for (var i = 0; i < 8; i++) {
    var rect = new Box2;
    selectionHandles.push(rect);
  }

  // add custom initialization here:
  // add a large green rectangle
  addRect(260, 70, 60, 65, 'white');

}


//wipes the canvas context
function clear(c) {
  c.clearRect(0, 0, WIDTH, HEIGHT);
}

// Main draw loop.
// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
function mainDraw() {
  if (canvasValid == false) {
    clear(ctx);

    // Add stuff you want drawn in the background all the time here

    // draw all boxes
    var l = boxes2.length;
    for (var i = 0; i < l; i++) {
      boxes2[i].draw(ctx); // we used to call drawshape, but now each box draws itself
    }

    // Add stuff you want drawn on top all the time here

    canvasValid = true;
  }
}

// Happens when the mouse is moving inside the canvas
function myMove(e) {
  if (isDrag) {
    getMouse(e);

    mySel.x = mx - offsetx;
    mySel.y = my - offsety;

    // something is changing position so we better invalidate the canvas!
    invalidate();
  } else if (isResizeDrag) {
    // time ro resize!
    var oldx = mySel.x;
    var oldy = mySel.y;

    // 0  1  2
    // 3     4
    // 5  6  7
    switch (expectResize) {
      case 0:
        mySel.x = mx;
        mySel.y = my;
        mySel.w += oldx - mx;
        mySel.h += oldy - my;
        break;
      case 1:
        mySel.y = my;
        mySel.h += oldy - my;
        break;
      case 2:
        mySel.y = my;
        mySel.w = mx - oldx;
        mySel.h += oldy - my;
        break;
      case 3:
        mySel.x = mx;
        mySel.w += oldx - mx;
        break;
      case 4:
        mySel.w = mx - oldx;
        break;
      case 5:
        mySel.x = mx;
        mySel.w += oldx - mx;
        mySel.h = my - oldy;
        break;
      case 6:
        mySel.h = my - oldy;
        break;
      case 7:
        mySel.w = mx - oldx;
        mySel.h = my - oldy;
        break;
    }

    invalidate();
  }

  getMouse(e);
  // if there's a selection see if we grabbed one of the selection handles
  if (mySel !== null && !isResizeDrag) {
    for (var i = 0; i < 8; i++) {
      // 0  1  2
      // 3     4
      // 5  6  7

      var cur = selectionHandles[i];

      // we dont need to use the ghost context because
      // selection handles will always be rectangles
      if (mx >= cur.x && mx <= cur.x + mySelBoxSize &&
        my >= cur.y && my <= cur.y + mySelBoxSize) {
        // we found one!
        expectResize = i;
        invalidate();

        switch (i) {
          case 0:
            this.style.cursor = 'nw-resize';
            break;
          case 1:
            this.style.cursor = 'n-resize';
            break;
          case 2:
            this.style.cursor = 'ne-resize';
            break;
          case 3:
            this.style.cursor = 'w-resize';
            break;
          case 4:
            this.style.cursor = 'e-resize';
            break;
          case 5:
            this.style.cursor = 'sw-resize';
            break;
          case 6:
            this.style.cursor = 's-resize';
            break;
          case 7:
            this.style.cursor = 'se-resize';
            break;
        }
        return;
      }

    }
    // not over a selection box, return to normal
    isResizeDrag = false;
    expectResize = -1;
    this.style.cursor = 'auto';
  }

}

// Happens when the mouse is clicked in the canvas
function myDown(e) {
  getMouse(e);

  //we are over a selection box
  if (expectResize !== -1) {
    isResizeDrag = true;
    return;
  }

  clear(gctx);
  var l = boxes2.length;
  for (var i = l - 1; i >= 0; i--) {
    // draw shape onto ghost context
    boxes2[i].draw(gctx, 'black');

    // get image data at the mouse x,y pixel
    var imageData = gctx.getImageData(mx, my, 1, 1);
    var index = (mx + my * imageData.width) * 4;

    // if the mouse pixel exists, select and break
    if (imageData.data[3] > 0) {
      mySel = boxes2[i];
      offsetx = mx - mySel.x;
      offsety = my - mySel.y;
      mySel.x = mx - offsetx;
      mySel.y = my - offsety;
      isDrag = true;

      invalidate();
      clear(gctx);
      return;
    }

  }
  // havent returned means we have selected nothing
  mySel = null;
  // clear the ghost canvas for next time
  clear(gctx);
  // invalidate because we might need the selection border to disappear
  invalidate();
}

function myUp() {
  isDrag = false;
  isResizeDrag = false;
  expectResize = -1;
}

// adds a new node
function myDblClick(e) {
  getMouse(e);
  // for this method width and height determine the starting X and Y, too.
  // so I left them as vars in case someone wanted to make them args for something and copy this code
  var width = 20;
  var height = 20;
  addRect(mx - (width / 2), my - (height / 2), width, height, 'white');
}


function invalidate() {
  canvasValid = false;
}

// Sets mx,my to the mouse position relative to the canvas
// unfortunately this can be tricky, we have to worry about padding and borders
function getMouse(e) {
  var element = canvas, offsetX = 0, offsetY = 0;

  if (element.offsetParent) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  offsetX += stylePaddingLeft;
  offsetY += stylePaddingTop;

  offsetX += styleBorderLeft;
  offsetY += styleBorderTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY
}
function drawInlineSVG(svgElement, x, y, Redraw,GetMathml) {
  // var svgElement = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:wrs="http://www.wiris.com/xml/cvs-extension" height="50" width="147" wrs:baseline="34"><!--MathML: <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mfrac><mrow><mo>-</mo><mi>b</mi><mo>&#xB1;</mo><msqrt><msup><mi>b</mi><mn>2</mn></msup><mo>-</mo><mn>4</mn><mi>a</mi><mi>c</mi></msqrt></mrow><mrow><mn>2</mn><mi>a</mi></mrow></mfrac></math>--><defs><style type="text/css">@font-face{font-family:'ae2ef524fbf3d9fe611d5a8e90fefdc';src:url(data:font/truetype;charset=utf-8;base64,AAEAAAAMAIAAAwBAT1MvMjv/LJYAAADMAAAATmNtYXDgWxEdAAABHAAAADRjdnQgAAAABwAAAVAAAAAEZ2x5ZoYrxVAAAAFUAAAA0WhlYWQOdyayAAACKAAAADZoaGVhC0UVwQAAAmAAAAAkaG10eCg8AIUAAAKEAAAACGxvY2EAAAVKAAACjAAAAAxtYXhwBIoEWwAAApgAAAAgbmFtZXSF9ZsAAAK4AAABrXBvc3QDogHPAAAEaAAAACBwcmVwukanGAAABIgAAAANAAAGtAGQAAUAAAgACAAAAAAACAAIAAAAAAAAAQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgICAAAAAg8AMGe/57AAAHPgGyAAAAAAACAAEAAQAAABQAAwABAAAAFAAEACAAAAAEAAQAAQAAAGH//wAAAGH///+gAAEAAAAAAAAABwACAFUAAAMAA6sAAwAHAAAzESERJSERIVUCq/2rAgD+AAOr/FVVAwAAAwAt/3QEAwRZAAsAFwAdADsYAbAdELAD1LADELAU1LAUELAc1LAcELAJ1LAcELAOPLAJELAbPACwBhCwEdSwBhCwANSwABCwF9QwMQEiABEWEjMyEjcQJgYWAwIGIyImNTQ2MwE1BhMjEgIBs/7fFvWy07oDhYZwFgxOhVmysoUB7YwEslEEWf7f/t71/t8BM+MBp5yyLf6d/wBlyJzfsvxZjF0B5/1eAAAAAAEAAAABAACav9usXw889QADCAD/////1a3uPf/////Vre49AAH+9QQDBkMAAAAKAAIAAQAAAAAAAQAABz7+TgAAF3AAAf/8BAMAAQAAAAAAAAAAAAAAAAAAAAIDUgBVBEwALQAAAAAAAAAoAAAA0QABAAAAAgAeAAMAAAAAAAIAgAQAAAAAAAQAADsAAAAAAAAAFQECAAAAAAAAAAEAFgAAAAAAAAAAAAIADgAWAAAAAAAAAAMANAAkAAAAAAAAAAQAFgBYAAAAAAAAAAUAFgBuAAAAAAAAAAYACwCEAAAAAAAAAAgAHACPAAEAAAAAAAEAFgAAAAEAAAAAAAIADgAWAAEAAAAAAAMANAAkAAEAAAAAAAQAFgBYAAEAAAAAAAUAFgBuAAEAAAAAAAYACwCEAAEAAAAAAAgAHACPAAMAAQQJAAEAFgAAAAMAAQQJAAIADgAWAAMAAQQJAAMANAAkAAMAAQQJAAQAFgBYAAMAAQQJAAUAFgBuAAMAAQQJAAYACwCEAAMAAQQJAAgAHACPAE0AYQB0AGgAIABGAG8AbgB0ACAAMgBSAGUAZwB1AGwAYQByAE0AYQB0AGgAcwAgAEYAbwByACAATQBvAHIAZQAgAE0AYQB0AGgAIABGAG8AbgB0ACAAMgBNAGEAdABoACAARgBvAG4AdAAgADIAVgBlAHIAcwBpAG8AbgAgADEALgAwTWF0aF9Gb250XzIATQBhAHQAaABzACAARgBvAHIAIABNAG8AcgBlAAAAAAMAAAAAAAADnwHPAAAAAAAAAAAAAAAAAAAAAAAAAAC5ByIAAI2FGACyAAAAAAAA)format('truetype');font-weight:normal;font-style:normal;}@font-face{font-family:'math19244194cbc38427b5aca056d4d';src:url(data:font/truetype;charset=utf-8;base64,AAEAAAAMAIAAAwBAT1MvMi7iBBMAAADMAAAATmNtYXDEvmKUAAABHAAAAERjdnQgDVUNBwAAAWAAAAA6Z2x5ZoPi2VsAAAGcAAABmGhlYWQQC2qxAAADNAAAADZoaGVhCGsXSAAAA2wAAAAkaG10eE2rRkcAAAOQAAAAEGxvY2EAHTwYAAADoAAAABRtYXhwBT0FPgAAA7QAAAAgbmFtZaBxlY4AAAPUAAABn3Bvc3QB9wD6AAAFdAAAACBwcmVwa1uragAABZQAAAAUAAADSwGQAAUAAAQABAAAAAAABAAEAAAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgICAAAAAg1UADev96AAAD6ACWAAAAAAACAAEAAQAAABQAAwABAAAAFAAEADAAAAAIAAgAAgAAAD0AsSIS//8AAAA9ALEiEv///8T/Ud3xAAEAAAAAAAAAAAAAAVQDLACAAQAAVgAqAlgCHgEOASwCLABaAYACgACgANQAgAAAAAAAAAArAFUAgACrANUBAAErAAcAAAACAFUAAAMAA6sAAwAHAAAzESERJSERIVUCq/2rAgD+AAOr/FVVAwAAAgCAAOsC1QIVAAMABwBlGAGwCBCwBtSwBhCwBdSwCBCwAdSwARCwANSwBhCwBzywBRCwBDywARCwAjywABCwAzwAsAgQsAbUsAYQsAfUsAcQsAHUsAEQsALUsAYQsAU8sAcQsAQ8sAEQsAA8sAIQsAM8MTATITUhHQEhNYACVf2rAlUBwFXVVVUAAgCA//8CgAKrAAsADwBlGAGwEBCwD9SwDxCwADywABCwAdSwARCwBNSwBBCwBdSwARCwCjywBBCwBzywBRCwDjwAsBAQsA/UsA8QsAzUsAwQsAnUsAkQsArUsAoQsAHUsAEQsALUsAEQsAQ8sAoQsAc8MDETMzUzFTMVIxUjJwcRIRUhgNZV1dVVAdUCAP4AAdXW1lbU1QH+1VUAAQCAAVUC1QGrAAMAMBgBsAQQsQAD9rADPLECB/WwATyxBQPmALEAABMQsQAG5bEAARMQsAE8sQMF9bACPBMhFSGAAlX9qwGrVgABAAAAAQAA1XjOQV8PPPUAAwQA/////9Y6E3P/////1joTcwAA/yAEgAOrAAAACgACAAEAAAAAAAEAAAPo/2oAABdwAAD/tgSAAAEAAAAAAAAAAAAAAAAAAAAEA1IAVQNWAIADAACAA1YAgAAAAAAAAAAoAAAAsgAAAU4AAAGYAAEAAAAEAF4ABQAAAAAAAgCABAAAAAAABAAA3gAAAAAAAAAVAQIAAAAAAAAAAQASAAAAAAAAAAAAAgAOABIAAAAAAAAAAwAwACAAAAAAAAAABAASAFAAAAAAAAAABQAWAGIAAAAAAAAABgAJAHgAAAAAAAAACAAcAIEAAQAAAAAAAQASAAAAAQAAAAAAAgAOABIAAQAAAAAAAwAwACAAAQAAAAAABAASAFAAAQAAAAAABQAWAGIAAQAAAAAABgAJAHgAAQAAAAAACAAcAIEAAwABBAkAAQASAAAAAwABBAkAAgAOABIAAwABBAkAAwAwACAAAwABBAkABAASAFAAAwABBAkABQAWAGIAAwABBAkABgAJAHgAAwABBAkACAAcAIEATQBhAHQAaAAgAEYAbwBuAHQAUgBlAGcAdQBsAGEAcgBNAGEAdABoAHMAIABGAG8AcgAgAE0AbwByAGUAIABNAGEAdABoACAARgBvAG4AdABNAGEAdABoACAARgBvAG4AdABWAGUAcgBzAGkAbwBuACAAMQAuADBNYXRoX0ZvbnQATQBhAHQAaABzACAARgBvAHIAIABNAG8AcgBlAAADAAAAAAAAAfQA+gAAAAAAAAAAAAAAAAAAAAAAAAAAuQcRAACNhRgAsgAAABUUE7EAAT8=)format('truetype');font-weight:normal;font-style:normal;}</style></defs><text font-family="Arial" font-size="16" font-style="italic" text-anchor="middle" x="4.5" y="34">x</text><text font-family="math19244194cbc38427b5aca056d4d" font-size="16" text-anchor="middle" x="17.5" y="34">=</text><line stroke="#000000" stroke-linecap="square" stroke-width="1" x1="28.5" x2="143.5" y1="28.5" y2="28.5"/><text font-family="math19244194cbc38427b5aca056d4d" font-size="16" text-anchor="middle" x="36.5" y="22">−</text><text font-family="Arial" font-size="16" font-style="italic" text-anchor="middle" x="47.5" y="22">b</text><text font-family="math19244194cbc38427b5aca056d4d" font-size="16" text-anchor="middle" x="60.5" y="22">±</text><polyline fill="none" points="12,-20 11,-20 5,0 2,-8" stroke="#000000" stroke-linecap="square" stroke-width="1" transform="translate(67.5,24.5)"/><polyline fill="none" points="5,0 2,-8 0,-7" stroke="#000000" stroke-linecap="square" stroke-width="1" transform="translate(67.5,24.5)"/><line stroke="#000000" stroke-linecap="square" stroke-width="1" x1="79.5" x2="141.5" y1="4.5" y2="4.5"/><text font-family="Arial" font-size="16" font-style="italic" text-anchor="middle" x="85.5" y="22">b</text><text font-family="Arial" font-size="12" text-anchor="middle" x="94.5" y="15">2</text><text font-family="math19244194cbc38427b5aca056d4d" font-size="16" text-anchor="middle" x="105.5" y="22">−</text><text font-family="Arial" font-size="16" text-anchor="middle" x="117.5" y="22">4</text><text font-family="ae2ef524fbf3d9fe611d5a8e90fefdc" font-size="16" font-style="italic" text-anchor="middle" x="126.5" y="22">a</text><text font-family="Arial" font-size="16" font-style="italic" text-anchor="middle" x="135.5" y="22">c</text><text font-family="Arial" font-size="16" text-anchor="middle" x="81.5" y="45">2</text><text font-family="ae2ef524fbf3d9fe611d5a8e90fefdc" font-size="16" font-style="italic" text-anchor="middle" x="90.5" y="45">a</text></svg>`;
  var svg = new Blob([svgElement], { type: "image/svg+xml;charset=utf-8" }),
    domURL = self.URL || self.webkitURL || self,
    url = domURL.createObjectURL(svg),
    img = new Image;

  img.onload = function () {
    ctx.drawImage(this, x, y);
    if (Redraw == false) {
      mySel.getSvg = svgElement;
      mySel.getMathml=GetMathml;
    }
    domURL.revokeObjectURL(url);
    //callback(this);
  };

  img.src = url;
}

async function writeSvgInCanvas() {
  try {
    closeEquationEditor();
    var getMathml = document.querySelector('#eqiframe').contentWindow.editor.getMathML();
    if (getMathml != "" && getMathml != '<math xmlns="http://www.w3.org/1998/Math/MathML"></math>') {
      var getSvg = await getsvgfromWiris(getMathml);
      if (getSvg.status == true) {
        drawInlineSVG(getSvg.data, mySel.x, mySel.y,false,getMathml);
      }

      console.log(getSvg);
    }
  }
  catch (e) {
    console.error(e);
  }
}


// If you dont want to use <body onLoad='init()'>
// You could uncomment this init() reference and place the script reference inside the body tag
//init();


// Andy added, as a replacement for 
// <body onLoad="init2()">
$(document).ready(function () {
  // Your code here
  init2();
});

