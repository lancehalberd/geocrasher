
var Random = {
    /**
     * @param {Number} min  The smallest returned value
     * @param {Number} max  The largest returned value
     */
    'range': function (A, B) {
        var min = Math.min(A, B);
        var max = Math.max(A, B);
        return Math.floor(Math.random() * (max + 1 - min)) + min;
    },

    /**
     * @param {Array} array  The array of elements to return random element from
     */
    'element': function (collection) {
        if (collection.constructor == Object) {
            var keys = Object.keys(collection);
            return collection[this.element(keys)];
        }
        if (collection.constructor == Array) {
            return collection[this.range(0, collection.length - 1)];
        }
        console.log("Warning @ Random.element: "+ collection + " is neither Array or Object");
        return null;
    },

    /**
     * @param {Array} array  The array of elements to return random element from
     */
    'removeElement': function (collection) {
        if (collection.constructor == Object) {
            var keys = Object.keys(collection);
            var key = this.element(keys);
            var value = collection[key];
            delete collection[key]
            return value;
        }
        if (collection.constructor == Array) {
            var spliced = collection.splice(this.range(0, collection.length - 1), 1);
            return spliced[0];
        }
        console.log("Warning @ Random.removeElement: "+ collection + " is neither Array or Object");
        return null;
    },

    /**
     * Shuffles an array.
     *
     * Knuth algorithm found at:
     * http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
     *
     * @param {Array} array  The array of elements to shuffle
     */
    'shuffle': function (array) {
        array = array.slice();
        var currentIndex = array.length, temporaryValue, randomIndex;
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
          // Pick a remaining element...
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;
          // And swap it with the current element.
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
        }
        return array;
    }
};

/**
 * Makes a deep copy of an object. Note that this will not make deep copies of
 * objects with prototypes.
 */
function copy(object) {
    if (typeof(object) === 'undefined' || object === null) {
        return null;
    }
    if (typeof(object) === 'string' || typeof(object) === 'number' || typeof(object) === 'boolean') {
        return object;
    }
    if (object.constructor == Array) {
        return jQuery.extend(true, [], object);
    }
    return jQuery.extend(true, {}, object);
}

function shallowCopy(object) {
    if (typeof(object) === 'undefined' || object === null) {
        return null;
    }
    if (typeof(object) === 'string' || typeof(object) === 'number' || typeof(object) === 'boolean') {
        return object;
    }
    if (object.constructor == Array) {
        return jQuery.extend([], object);
    }
    return jQuery.extend({}, object);
}

function properCase(string) {
    return string.split(' ').map(function (word) {return word.charAt(0).toUpperCase() + word.substring(1)}).join(' ');
}

/**
 * Returns the angle from (x1, y1) to (x2,y2) which when given an image facing
 * right at angle 0, will point the image from x1,y1 towards x2,y2 when
 * context.rotate(angle) is used.
 *
 * @param {Number} x1
 * @param {Number} y1
 * @param {Number} x2
 * @param {Number} y2
 * @return {Number}
 */
function atan2(x1, y1, x2, y2) {
    if (x1 == x2) {
        return(y2 > y1) ? Math.PI / 2 : -Math.PI / 2;
    }
    return Math.atan((y2 - y1) / (x2 - x1)) + (x2 < x1 ? Math.PI : 0);
}

function ifdefor(value, defaultValue) {
    if (value !== undefined) {
        return value;
    }
    if (defaultValue !== undefined) {
        return defaultValue;
    }
    return null;
}


function tag(type, classes, content) {
    return '<' + type + ' class="' + ifdefor(classes, '') + '">' + ifdefor(content, '') + '</' + type + '>';
}

function $tag(type, classes, content) {
    return $(tag(type, classes, content));
}

function now() {
    return Math.floor(new Date().getTime());
}

function isPointInRect(x, y, l, t, w, h) {
    return !(y < t || y > (t + h) || x < l || x > (l + w));
}

function isPointInRectObject(x, y, rectangle) {
    return !(y < rectangle.top || y > (rectangle.top + rectangle.height)
        || x < rectangle.left || x > (rectangle.left + rectangle.width));
}


function rectanglesOverlap(A, B) {
    return !(ifdefor(A.bottom, A.top + A.height) < B.top
        || A.top > ifdefor(B.bottom, B.top + B.height)
        || ifdefor(A.right, A.left + A.width) < B.left
        || A.left > ifdefor(B.right, B.left + B.width));
}

function isMouseOver($div) {
    var x = $('.js-mouseContainer').offset().left + mousePosition[0];
    var y = $('.js-mouseContainer').offset().top + mousePosition[1];
    var t = $div.offset().top;
    var l = $div.offset().left;
    var b = t + $div.outerHeight(true);
    var r = l + $div.outerWidth(true);
    return !(y < t || y > b || x < l || x > r);
}

function collision($div1, $div2) {
    var T = $div1.offset().top;
    var L = $div1.offset().left;
    var B = T + $div1.outerHeight(true);
    var R = L + $div1.outerWidth(true);
    var t = $div2.offset().top;
    var l = $div2.offset().left;
    var b = t + $div2.outerHeight(true);
    var r = l + $div2.outerWidth(true);
    return !(B < t || T > b || R < l || L > r);
}

// returns the area overlap between two divs.
function getCollisionArea($div1, $div2) {
    var T = $div1.offset().top;
    var L = $div1.offset().left;
    var B = T + $div1.outerHeight(true);
    var R = L + $div1.outerWidth(true);
    var t = $div2.offset().top;
    var l = $div2.offset().left;
    var b = t + $div2.outerHeight(true);
    var r = l + $div2.outerWidth(true);
    return Math.max(Math.min(B - t, b - T), 0) * Math.max(Math.min(R - l, r - L), 0);
}

function $getClosestElement($element, $elements, threshold) {
    var closestElement = null;
    var closestDistanceSquared = threshold * threshold;
    var center = rectangleCenter(getElementRectangle($element));
    $elements.each(function (index, element) {
        var elementCenter = rectangleCenter(getElementRectangle(element));
        var d2 = distanceSquared(center, elementCenter);
        if (d2 <= closestDistanceSquared) {
            closestDistanceSquared = d2;
            closestElement = element;
        }
    });
    return closestElement ? $(closestElement) : null;
}

function getElementRectangle(element) {
    var $element = $(element);
    return rectangle($element.offset().left, $element.offset().top, $element.outerWidth(true), $element.outerHeight(true));
}

/**
 * @param {Number} width
 * @param {Number} height
 * @return {Element}
 */
function createCanvas(width, height, classes) {
    classes = ifdefor(classes, '');
    return $('<canvas class="' + classes + '"width="' + width + '" height="' + height + '"></canvas>')[0];
}

function resize(element, width, height, left, top) {
    var $element = $(element);
    $element.css('width', width + 'px').css('height', height + 'px');
    if (ifdefor(left) != null) {
        $element.css('left', left + 'px');
    }
    if (ifdefor(top) != null) {
        $element.css('top', top + 'px');
    }
}

function constrain(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function rectangle(left, top, width, height) {
    return {left: left, top: top, width: width, height: height, right: left + width, bottom: top + height};
}
function rectangleCenter(rectangle) {
    return [rectangle.left + rectangle.width / 2, rectangle.top + rectangle.height / 2];
}
function rectangleFromPoints(A, B) {
    var left = Math.min(A.x, B.x);
    var top = Math.min(A.y, B.y);
    return rectangle(left, top, Math.abs(A.x - B.x), Math.abs(A.y - B.y));
}

function drawRunningAnts(context, rectangle) {
    context.save();
    context.strokeStyle = 'black';
    var frame = Math.floor(now() / 80) % 10;
    if (frame < 5) {
        context.setLineDash([frame, 5, 5 - frame, 0]);
    } else {
        context.setLineDash([0, frame - 5, 5, 10 - frame]);
    }
    context.strokeRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    context.strokeStyle = 'white';
    frame = (frame + 5) % 10;
    if (frame < 5) {
        context.setLineDash([frame, 5, 5 - frame, 0]);
    } else {
        context.setLineDash([0, frame - 5, 5, 10 - frame]);
    }
    context.strokeRect(rectangle.left, rectangle.top, rectangle.width, rectangle.height);
    context.restore();
}

function objectIndexOf(object, value, defaultValue) {
    for (var key of Object.keys(object)) {
        if (object[key] === value) {
            return key;
        }
    }
    return ifdefor(defaultValue);
}

function arrMod(array, index) {
    return array[(index + array.length) % array.length];
}

function fixFloat(f) {
    return Math.round(1000000 * f) / 1000000;
}

function removeElementFromArray(array, element, throwErrorIfMissing) {
    var index = array.indexOf(element);
    if (index < 0) {
        if (throwErrorIfMissing) throw new Error("Element was not found to remove from array.");
        return;
    }
    array.splice(index, 1);
}
function countInstancesOfElementInArray(array, element) {
    var count = 0;
    for (var arrayElement of array) {
        if (arrayElement === element) count++;
    }
    return count;
}

Number.prototype.abbreviate = function () {
    if (this >= 1000000000000) {
        return (this / 1000000000000 + '').slice(0, 5) + 'T';
    }
    if (this >= 1000000000) {
        return (this / 1000000000 + '').slice(0, 5) + 'B';
    }
    if (this >= 1000000) {
        return (this / 1000000 + '').slice(0, 5) + 'M';
    }
    if (this >= 10000) {
        return (this / 1000 + '').slice(0, 5) + 'K';
    }
    return this;
}