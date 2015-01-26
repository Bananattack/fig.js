fig.js
======

***by Andrew G. Crowell***

A .gif decoder for JavaScript.

Usage
-----

To use `fig`, first include it somewhere, for example:

    <script src='fig.js'></script>

After that, you can call the fig API functions.

You can also check the included **index.html** for a small example program.

API
---

### fig.load

Hook a file input or drag and drop handler up somewhere, and call fig.load to load a file list:

    fig.load({
        // (Required) An array of one or more File objects that references a GIF to load.
        files: files,

        // When raw is true, do not call renderFrames() on the loaded GifImage objects.
        raw: false,

        // A callback that is invoked when all GIFs are successfully loaded.
        // Passed an array of GifImage objects, returned in the same order as the source file array.
        oncomplete: function(gifs) {
            for(var i = 0; i < gifs.length; i++) {
                var gif = gifs[i];
                for(var j = 0; j < gif.frames.length; j++) {
                    document.body.appendChild(gif.frames[j].canvas);
                }
            }
        },

        // A callback that is invoked when a particular files fails to load as a GIF.
        onerror: function(file, error) {
            alert('Failed to open ' + file.name + ' - ' + error);
        }
    });

If `fig.load` is successful, it invokes the `oncomplete` callback with an array of GifImage objects as its argument, returned in the same order as the original `files` array. Otherwise, it calls the `onerror` function, once per file that failed to load. The `raw` flag can be specified to indicate not to call `renderFrames()` on the GifImage objects automatically.

### fig.GifReader

For more advanced usage, one can also use a GifReader directly:

    // arrayBuffer is an ArrayBuffer optained from some external load process
    // For example, the HTML5 FileReader API.
    var data = new Uint8Array(arrayBuffer);
    var reader = new fig.GifReader(data);

    // Handle errors returned during GIF reading (optional)
    reader.onerror = function(err) {
        alert(error);
    }

    // Returns a GifImage on success, and null on failure.
    // (Use the onerror handler to figure out the specific failure case.)
    var gif = reader.read();

    if(gif) {
        // Do stuff with GIF.
    }


The result of reader is a GifImage object, or `null` on failure. The `onerror` callback of the GifReader can be provided for better diagnostics. This API uses error callbacks rather than exceptions to work more easily with asynchronous use.

Note that unlike with `fig.load(...)`, the GifReader returns a single raw GifImage on success. Directly using GifReader will not call `renderFrames()` on the returned object.

### fig.GifImage

A GifImage represents a GIF document.

It has the following properties:

- `gif.header` - a GifHeader object that describes some basic versioning information about the GIF file format.
- `gif.screenDescriptor` - a GifScreenDescriptor object describing the properties of the virtual screen used to render this GIF.
- `gif.frames` - an array of GifFrame objects.

It has the following methods:

- `gif.renderFrames()` - populates each of the frames in the GifImage with a rendered canvas

### fig.GifHeader

A header containing some basic versioning information about a GIF.

- `header.version` - a number representing the version of the GIF format that this file is written in.

### fig.GifScreenDescriptor

An object describing the properties of the virtual screen used to render a GIF.

- `scr.width` - the width of the virtual screen in pixels
- `scr.height` - the height of the virtual screen in pixels
- `scr.globalColors` - an array of global colors stored as a series of 4 RGBA bytes, or `null` if no global palette.
- `scr.backgroundIndex` - the color index to be considered the background.
- `scr.aspect` - the pixel aspect ratio.

### fig.GifFrame

An object describing a single frame in a GIF.

- `frame.graphicsControl` - a GifGraphicsControl object that describes some animation and disposal properties for this frame.
- `frame.imageDescriptor` - a GifImageDescriptor object describing the some properties of the frame's image data.
- `frame.indexData` - a Uint8Array containing indexed color data representing the pixel graphic for this frame.
- `frame.canvas` - an HTML5 Canvas representing the complete render for this frame. Exists if the GifImage `renderFrames()` method was called, `null` otherwise.
- `frame.context` - a 2D drawing context used to make a complete render for this frame. Exists if the GifImage `renderFrames()` method was called, `null` otherwise.

## fig.GifGraphicsControl

An object that describes some animation and disposal properties for a frame.

- `gfx.delay` - a value representing the time in 1/100ths of a second to wait before the next frame
- `gfx.isTransparent` - a boolean indicating whether this uses transparency.
- `gfx.transparencyIndex` - a numeric index indicating what color in the palette is transparent.
- `gfx.disposal` - a number indicating the graphic disposal mode:
    - `fig.GifDisposal.UNSPECIFIED` = 0
    - `fig.GifDisposal.NONE` = 1
    - `fig.GifDisposal.BACKGROUND` = 2
    - `fig.GifDisposal.PREVIOUS` = 3

### fig.GifImageDescriptor

An object describing the some properties of a frame's image data.

- `desc.x` - The x position of the frame image relative to the virtual screen.
- `desc.y` - The y position of the frame image relative to the virtual screen.
- `desc.width` - The width of the frame image.
- `desc.height` - The height of the frame image.
- `desc.localColors` - an array of local colors stored as a series of 4 RGBA bytes, or `null` if no local palette.
- `desc.interlace` - a boolean indicating whether the image data was interlaced.

License
-------

The source code for fig is released under the MIT license:

    Copyright © 2015 Andrew G. Crowell

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
    of the Software, and to permit persons to whom the Software is furnished to do
    so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.

References
----------

* Andrew G. Crowell. [fig C Library][1]
* Matthew Flickinger. [Project: What's In A GIF - Bit by Byte][2].
* W3C. [Cover Sheet for the GIF89a Specification][3].
* Steve Blackstock. [LZW and GIF explained][4].
* Bob Montgomery. [LZW compression used to encode/decode a GIF file][5].
* stb. [stb_image.h Source Code][6].
* ImageMagick v6 Documentation. [ImageMagick v6 Examples -- Animation Basics][7].

[1]: https://github.com/Bananattack/fig
[2]: http://www.matthewflickinger.com/lab/whatsinagif/bits_and_bytes.asp
[3]: http://www.w3.org/Graphics/GIF/spec-gif89a.txt
[4]: http://gingko.homeip.net/docs/file_formats/lzwgif.html#ste
[5]: http://gingko.homeip.net/docs/file_formats/lzwgif.html#bob
[6]: https://github.com/nothings/stb/blob/master/stb_image.h
[7]: http://www.imagemagick.org/Usage/anim_basics/
