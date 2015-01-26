(function(fig) {
    window.fig = fig;

    var gif = {
        header: {
            LENGTH: 6
        },
        block: {
            EXTENSION: 0x21,
            IMAGE: 0x2C,
            TERMINATOR: 0x3B
        },
        extension: {
            PLAIN_TEXT: 0x01,
            GRAPHICS_CONTROL: 0xF9,
            COMMENT: 0xFE,
            APPLICATION: 0xFF
        },
        screenDescriptor: {
            GLOBAL_COLOR: 0x80,
            DEPTH_MASK: 0x07,
            LENGTH: 7
        },
        imageDescriptor: {
            LOCAL_COLOR: 0x80,
            INTERLACE: 0x40,
            DEPTH_MASK: 0x07,
            LENGTH: 9
        },
        graphicsControl: {
            TRANSPARENCY: 0x01,
            DISPOSAL_MASK: 0x1C,
            DISPOSAL_SHIFT: 2,
            LENGTH: 5
        },
        lzw: {
            MAX_BITS: 12,
            MAX_CODES: (1 << 12),
            MAX_STACK_SIZE: (1 << 12) + 1,
            NULL_CODE: 0xCACA
        },
        disposal: {
            UNSPECIFIED: 0,
            NONE: 1,
            BACKGROUND: 2,
            PREVIOUS: 3,
            COUNT: 4
        }
    };
 

    var GifDisposal = fig.GifDisposal = gif.disposal;

    var GifHeader = fig.GifHeader = function() {
        this.version = 0;
    };

    var GifScreenDescriptor = fig.GifScreenDescriptor = function() {
        this.width = 0;
        this.height = 0;
        this.globalColors = null;
        this.backgroundIndex = 0;
        this.aspect = 0;
    };

    var GifGraphicsControl = fig.GifGraphicsControl = function() {
        this.delay = 0;
        this.isTransparent = false;
        this.transparencyIndex = false;
        this.disposal = gif.disposal.UNSPECIFIED;
    };

    var GifImageDescriptor = fig.GifImageDescriptor = function() {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.localColors = null;
        this.interlace = false;
    };

    var GifFrame = fig.GifFrame = function() {
        this.graphicsControl = null;
        this.imageDescriptor = null;
        this.indexData = null;
        this.canvas = null;
        this.context = null;
    };

    var GifImage = fig.GifImage = function() {
        this.header = null;
        this.screenDescriptor = null;
        this.frames = [];
    };

    var disposeIndexedFrame = function(screenDescriptor, prev, cur, next) {
        var localX = cur.imageDescriptor.x;
        var localY = cur.imageDescriptor.y;
        var localWidth = cur.imageDescriptor.width;
        var localHeight = cur.imageDescriptor.height;
        var isTransparent = cur.graphicsControl ? cur.graphicsControl.isTransparent : false;
        var transparencyIndex = cur.graphicsControl ? cur.graphicsControl.transparencyIndex : 0;
        var indexData = cur.indexData;
        var nextData = next.context.getImageData(0, 0, next.canvas.width, next.canvas.height);
        var disposal = cur.graphicsControl ? cur.graphicsControl.disposal : gif.disposal.UNSPECIFIED;

        switch(disposal) {
            case gif.disposal.BACKGROUND:
                for(var i = 0; i < localHeight; i++) {
                    for(var j = 0; j < localWidth; j++) {
                        if(!isTransparent || indexData[i * localWidth + j] != transparencyIndex) {
                            var x = (localX + j);
                            var y = (localY + i);
                            if(x < 0 || x >= nextData.width || y < 0 || y >= nextData.height) {
                                continue;
                            }

                            var k = (y * nextData.width + x) * 4;
                            nextData.data[k + 0] = 0;
                            nextData.data[k + 1] = 0;
                            nextData.data[k + 2] = 0;
                            nextData.data[k + 3] = 0;
                        }
                    }
                }

                next.canvas.getContext('2d').putImageData(nextData, 0, 0);
                break;
            case gif.disposal.PREVIOUS:
                var prevData = prev != null ? prev.context.getImageData(0, 0, prev.canvas.width, prev.canvas.height) : null;

                for(var i = 0; i < localHeight; i++) {
                    for(var j = 0; j < localWidth; j++) {
                        if(!isTransparent || indexData[i * localWidth + j] != transparencyIndex) {
                            var x = (localX + j);
                            var y = (localY + i);
                            if(x < 0 || x >= nextData.width || y < 0 || y >= nextData.height) {
                                continue;
                            }

                            var k = (y * nextData.width + x) * 4;
                            if(prevData) {
                                nextData.data[k + 0] = prevData.data[k + 0];
                                nextData.data[k + 1] = prevData.data[k + 1];
                                nextData.data[k + 2] = prevData.data[k + 2];
                                nextData.data[k + 3] = prevData.data[k + 3];
                            } else {
                                nextData.data[k + 0] = 0;
                                nextData.data[k + 1] = 0;
                                nextData.data[k + 2] = 0;
                                nextData.data[k + 3] = 0;
                            }
                        }
                    }
                }

                next.context.putImageData(nextData, 0, 0);
                break;
            case gif.disposal.UNSPECIFIED:
            case gif.disposal.NONE:
            default:
                break;
        }
    }

    function blitIndexedFrame(screenDescriptor, frame) {
        var palette = frame.imageDescriptor.localColors || screenDescriptor.globalColors;
        var localX = frame.imageDescriptor.x;
        var localY = frame.imageDescriptor.y;
        var localWidth = frame.imageDescriptor.width;
        var localHeight = frame.imageDescriptor.height;
        var isTransparent = frame.graphicsControl ? frame.graphicsControl.isTransparent : false;
        var transparencyIndex = frame.graphicsControl ? frame.graphicsControl.transparencyIndex : 0;
        var indexData = frame.indexData;
        var canvasData = frame.context.getImageData(0, 0, frame.canvas.width, frame.canvas.height);

        for(var i = 0; i < localHeight; i++) {
            for(var j = 0; j < localWidth; j++) {
                var index = indexData[i * localWidth + j];

                if(index < 0 || index >= palette.length) {
                    continue;
                }

                if(!isTransparent || index !== transparencyIndex) {
                    var x = (localX + j);
                    var y = (localY + i);
                    if(x < 0 || x >= canvasData.width || y < 0 || y >= canvasData.height) {
                        continue;
                    }

                    index *= 4;
                    var k = (y * canvasData.width + x) * 4;

                    canvasData.data[k + 0] = palette[index + 0];
                    canvasData.data[k + 1] = palette[index + 1];
                    canvasData.data[k + 2] = palette[index + 2];
                    canvasData.data[k + 3] = palette[index + 3];
                }
            }
        }

        frame.context.putImageData(canvasData, 0, 0);
    }

    GifImage.prototype.renderFrames = function() {
        var frames = this.frames;

        for(var i = 0; i < frames.length; i++) {
            var canvas = document.createElement('canvas');
            canvas.width = this.screenDescriptor.width;
            canvas.height = this.screenDescriptor.height;
            frames[i].canvas = canvas;
            frames[i].context = canvas.getContext('2d');
        }
        
        var prev = null;
        var cur = null;

        for(var i = 0; i < frames.length; i++) {
            var next = frames[i];

            if(cur == null) {
                next.context.clearRect(0, 0, next.canvas.width, next.canvas.height);
            } else {
                next.context.drawImage(cur.canvas, 0, 0);
                disposeIndexedFrame(this.screenDescriptor, prev, cur, next);
            }

            blitIndexedFrame(this.screenDescriptor, next);

            if(cur != null) {
                var disposal = cur.graphicsControl ? cur.graphicsControl.disposal : gif.disposal.UNSPECIFIED;
                if(disposal == gif.disposal.NONE || disposal == gif.disposal.UNSPECIFIED) {
                    prev = cur;
                }
            }
            cur = next;
        }
    }

    var GifReader = fig.GifReader = function(buffer) {
        this.buffer = buffer;
        this.position = 0;
        this.onerror = function(err){};
    };

    GifReader.prototype.readHeader = function() {
        var buffer = this.buffer;
        var i = this.position;
        if(i + gif.header.LENGTH >= buffer.length) {
            this.onerror('invalid GIF header (encountered early end of stream)');
            return null;
        }        

        var signature = String.fromCharCode.apply(null, Array.prototype.slice.call(buffer, i, i + gif.header.LENGTH));
        i += gif.header.LENGTH;
        this.position = i;

        if(signature !== 'GIF87a' && signature !== 'GIF89a') {
            this.onerror('invalid GIF header (invalid version signature)');
            return null;
        }
        
        var result = new GifHeader();
        result.version = +signature.substr(3, 2)
        return result;
    }

    GifReader.prototype.readScreenDescriptor = function() {
        var buffer = this.buffer;
        var i = this.position;

        if(i + gif.screenDescriptor.LENGTH >= buffer.length) {
            this.onerror('invalid screen descriptor (encountered early end of stream)');
            return null;
        }

        var result = new GifScreenDescriptor();
        result.width = buffer[i] | (buffer[i + 1] << 8); i += 2;
        result.height = buffer[i] | (buffer[i + 1] << 8); i += 2;

        var packedFields = buffer[i]; i++;
        if((packedFields & gif.screenDescriptor.GLOBAL_COLOR) !== 0) {
            result.globalColors = new Uint8Array(4 * (1 << ((packedFields & gif.screenDescriptor.DEPTH_MASK) + 1)));
        }

        result.backgroundIndex = buffer[i]; i++;
        result.aspect = buffer[i]; i++;

        this.position = i;

        return result;
    }

    GifReader.prototype.readGraphicsControl = function() {
        var buffer = this.buffer;
        var i = this.position;

        if(i + gif.graphicsControl.LENGTH >= buffer.length) {
            this.onerror('invalid graphics control block (encountered early end of stream)');
            return null;
        }

        var result = new GifGraphicsControl();

        var len = buffer[i]; i++;
        if(len !== gif.graphicsControl.LENGTH - 1) {
            this.onerror('invalid graphics control block (block size does not match GIF specification)');
            return null;
        }

        var packedFields = buffer[i]; i++;

        result.isTransparent = (packedFields & gif.graphicsControl.TRANSPARENCY) !== 0;
        result.disposal = (packedFields & gif.graphicsControl.DISPOSAL_MASK) >> gif.graphicsControl.DISPOSAL_SHIFT;
        if(result.disposal >= gif.disposal.COUNT) {
            result.disposal = gif.disposal.UNSPECIFIED;
        }

        result.delay = buffer[i] | (buffer[i + 1] << 8); i += 2;
        result.transparencyIndex = buffer[i]; i++;

        this.position = i;

        if(!this.skipSubBlocks()) {
            return null;
        }

        return result;
    }

    GifReader.prototype.readImageDescriptor = function() {
        var buffer = this.buffer;
        var i = this.position;

        if(i + gif.imageDescriptor.LENGTH >= buffer.length) {
            this.onerror('invalid image descriptor (encountered early end of stream)');
            return null;
        }

        var result = new GifImageDescriptor();

        result.x = buffer[i] | (buffer[i + 1] << 8); i += 2;
        result.y = buffer[i] | (buffer[i + 1] << 8); i += 2;
        result.width = buffer[i] | (buffer[i + 1] << 8); i += 2;
        result.height = buffer[i] | (buffer[i + 1] << 8); i += 2;

        var packedFields = buffer[i]; i++;
        if((packedFields & gif.imageDescriptor.LOCAL_COLOR) !== 0) {
            result.localColors = new Uint8Array(4 * (1 << ((packedFields & gif.imageDescriptor.DEPTH_MASK) + 1)));
        }
        result.interlace = (packedFields & gif.imageDescriptor.INTERLACE) !== 0;

        this.position = i;

        return result;
    }

    GifReader.prototype.readPalette = function(palette) {
        var buffer = this.buffer;
        var i = this.position;

        if(i + (palette.length / 4) >= buffer.length) {
            this.onerror('invalid palette data (encountered early end of stream)');
            return false;
        }

        var size = palette.length;
        for(j = 0; j < size; j += 4, i += 3) {
            palette[j + 0] = buffer[i + 0]
            palette[j + 1] = buffer[i + 1]
            palette[j + 2] = buffer[i + 2]
            palette[j + 3] = 0xFF;
        }

        this.position = i;

        return true;
    }

    GifReader.prototype.skipSubBlocks = function() {
        var buffer = this.buffer;
        var i = this.position;

        do {
            if(i >= buffer.length) {
                this.onerror('invalid sub block (encountered early end of stream)');
                return false;
            }

            var len = buffer[i++];
            if(i + len >= buffer.length) {
                this.onerror('invalid sub block (encountered early end of stream)');
                return false;
            }

            i += len;
        } while(len > 0);

        this.position = i;

        return true;
    }

    GifReader.prototype.readFrame = function(frame) {
        var i = this.position;
        var buffer = this.buffer;

        if(i >= buffer.length) {
            this.onerror('invalid frame data (encountered early end of stream)');
            return false;
        }

        var minCodeSize = buffer[i++];
        if(minCodeSize > gif.lzw.MAX_BITS) {
            this.onerror('invalid frame data (minimum code requires more bits than permitted by GIF specification)');
            return false;
        }

        var clear = 1 << minCodeSize;
        var eoi = clear + 1;
        var codeSize = minCodeSize + 1;
        var codeMask = (1 << codeSize) - 1;
        var avail = eoi + 1;
        var oldCode = gif.lzw.NULL_CODE;

        var prefixCodes = new Array(gif.lzw.MAX_CODES);
        var suffixChars = new Array(gif.lzw.MAX_CODES);
        for(var c = 0; c < clear; c++) {
            prefixCodes[c] = gif.lzw.NULL_CODE;
            suffixChars[c] = c & 0xFF;
        }

        var charStack = [];
        var subBlockLength = 0;
        var bits = 0;
        var value = 0;
        var firstChar = 0;
        var x = 0;
        var y = 0;
        var imagePass = frame.imageDescriptor.interlace ? 3 : 0;
        var imagePitch = frame.imageDescriptor.interlace ? 8 : 1;

        while(true) {
            if(bits < codeSize) {
                if(subBlockLength === 0) {
                    if(i >= buffer.length) {
                        this.onerror('invalid frame data (encountered early end of stream)');
                        return false;
                    }
                    subBlockLength = buffer[i++];
                    if(subBlockLength === 0) {
                        this.position = i;
                        return true;
                    }
                }
                if(i >= buffer.length) {
                    this.onerror('invalid frame data (encountered early end of stream)');
                    return false;
                }
                value |= buffer[i++] << bits;
                bits += 8;
                subBlockLength--;
            } else {
                var code = value & codeMask;

                value >>= codeSize;
                bits -= codeSize;

                if(code === clear) {
                    codeSize = minCodeSize + 1;
                    codeMask = (1 << codeSize) - 1;
                    avail = eoi + 1;
                    oldCode = gif.lzw.NULL_CODE;
                } else if(code === eoi) {
                    if(i + subBlockLength >= buffer.length) {
                        this.onerror('invalid frame data (encountered early end of stream)');
                        return false;
                    }
                    i += subBlockLength;
                    this.position = i;
                    return this.skipSubBlocks();
                } else if(oldCode === gif.lzw.NULL_CODE) {
                    if(code >= gif.lzw.MAX_CODES
                    || charStack.length >= gif.lzw.MAX_STACK_SIZE) {
                        this.onerror('invalid frame data (character stack overflow)');
                        return false;
                    }
                    charStack.push(suffixChars[code]);
                    firstChar = code & 0xFF;
                    oldCode = code;
                } else if(code <= avail) {
                    var currentCode = code;

                    if(currentCode === avail) {
                        if(charStack.length >= gif.lzw.MAX_STACK_SIZE) {
                            this.onerror('invalid frame data (character stack overflow)');
                            return false;
                        }
                        charStack.push(firstChar);
                        currentCode = oldCode;
                    }
                    while(currentCode >= clear) {
                        if(currentCode >= gif.lzw.MAX_CODES) {
                            this.onerror('invalid frame data (exhausted available prefix codes)');
                            return false;
                        }
                        if(charStack.length >= gif.lzw.MAX_STACK_SIZE) {
                            this.onerror('invalid frame data (character stack overflow)');
                            return false;
                        }
                        charStack.push(suffixChars[currentCode]);
                        currentCode = prefixCodes[currentCode];
                    }

                    firstChar = suffixChars[currentCode];

                    if(charStack.length >= gif.lzw.MAX_STACK_SIZE) {
                        this.onerror('invalid frame data (character stack overflow)');
                        return false;
                    }
                    charStack.push(firstChar);

                    if(avail < gif.lzw.MAX_CODES) {
                        prefixCodes[avail] = oldCode;
                        suffixChars[avail] = firstChar;
                        avail++;
                        if((avail & codeMask) === 0 && avail < gif.lzw.MAX_CODES) {
                            codeSize++;
                            codeMask = (1 << codeSize) - 1;
                        }
                    }

                    oldCode = code;
                } else {
                    this.onerror('invalid frame data (invalid code encountered)');
                    return false;
                }


                var indexData = frame.indexData;
                var width = frame.imageDescriptor.width;
                var height = frame.imageDescriptor.height;
                while(charStack.length > 0) {
                    if(y >= height) {
                        break;
                    }

                    var top = charStack.pop();
                    indexData[y * width + x] = top;
                    x++;

                    if(x >= width) {
                        x = 0;
                        y += imagePitch;
                        if(y >= height && imagePass > 0) {
                            imagePitch = 1 << imagePass;
                            y = imagePitch >>> 1;
                            imagePass--;
                        }
                    }
                }
            }
        }
    }

    GifReader.prototype.read = function() {
        var img = new GifImage();
        
        var header = this.readHeader();
        if(!header) {
            return null;
        }

        img.header = header;

        var screenDescriptor = this.readScreenDescriptor();
        if(!screenDescriptor) {
            return null;
        }
        if(screenDescriptor.globalColors !== null) {
            if(!this.readPalette(screenDescriptor.globalColors)) {
                return null;
            }
        }

        img.screenDescriptor = screenDescriptor;

        var graphicsControl = null;
        while(true) {
            if(this.position >= this.buffer.length) {
                return null;
            }

            var blockType = this.buffer[this.position++];
            switch(blockType) {
                case gif.block.EXTENSION:
                    if(this.position >= this.buffer.length) {
                        return null;
                    }

                    var extensionType = this.buffer[this.position++];
                    switch(extensionType) {
                        case gif.extension.GRAPHICS_CONTROL:
                            var graphicsControl = this.readGraphicsControl();
                            if(!graphicsControl) {
                                return null;
                            }
                            break;
                        default:
                            if(!this.skipSubBlocks()) {
                                return null;
                            }
                            break;
                    }

                    break;
                case gif.block.IMAGE:
                    var imageDescriptor = this.readImageDescriptor();
                    if(!imageDescriptor) {
                        return null;
                    }
                    if(imageDescriptor.localColors !== null) {
                        if(!this.readPalette(imageDescriptor.localColors)) {
                            return null;
                        }
                    }

                    var frame = new GifFrame();
                    frame.graphicsControl = graphicsControl;
                    frame.imageDescriptor = imageDescriptor;
                    frame.indexData = new Uint8Array(imageDescriptor.width * imageDescriptor.height);

                    if(!this.readFrame(frame)) {
                        return null;
                    }

                    img.frames.push(frame);
                    break;
                case gif.block.TERMINATOR:
                    return img;
            }
        }
    }


    fig.load = function(arguments) {
        var files = arguments.files;
        var raw = arguments.raw || false;
        var oncomplete = arguments.oncomplete || function(){};
        var onerror = arguments.onerror || function(file, err){};

        var gifs = new Array(files.length);
        var remaining = files.length;

        for(var i = 0; i < files.length; i++) {
            (function(i) {
                var file = files[i];
                var reader = new FileReader();

                reader.onload = function(event) {
                    var gifReader = new fig.GifReader(new Uint8Array(event.target.result));

                    gifReader.onerror = function(err) {
                        onerror(file, err);
                    }

                    var gif = gifReader.read();
                    if(gif) {
                        if(!raw) {
                            gif.renderFrames();
                        }

                        gifs[i] = gif;
                        remaining--;
                        if(remaining == 0) {
                            oncomplete(gifs);
                        }
                    }
                };

                reader.readAsArrayBuffer(file);
            })(i);
        }
    }
})({});