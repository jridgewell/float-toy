function load(array, input, output, help, hex, leftshift, rightshift, rightrightshift) {
  var bytes = new Uint8Array(array.buffer);
  var hexLength = bytes.length;
  var bit = array.byteLength === 8 ? 1n : 1;

  function reduceNumber(x) {
    return x;
  }

  // Populate HTML
  var html = "<table>";
  // The bit numbers
  html += "<tr>";
  for (var i = 0; i < bytes.length; i++) {
    for (var j = 0; j < 8; j++) {
      var index = (bytes.length - i) * 8 - j;
      if (j > 3) {
        html += '<td class="nibble">' + index + "</td>";
      } else {
        html += '<td class="dark nibble">' + index + "</td>";
      }
    }
  }
  html += "</tr>";
  // The bits
  html += "<tr>";
  for (var i = 0; i < bytes.length; i++) {
    for (var j = 0; j < 8; j++) {
      var index = i * 8 + j;
      var className = index === 0 ? "sign" : "integer";
      html += '<td data-index="' + index + '" class="' + className + '">0</td>';
    }
  }
  html += "</tr></table>";
  input.innerHTML = html;

  // Grab elements
  var elements = [];
  for (var i = 0; i < bytes.length * 8; i++) {
    (function (i) {
      var element = input.querySelector('[data-index="' + i + '"]');
      element.onmouseover = function () {
        this.classList.add("hover");
      };
      element.onmouseout = function () {
        this.classList.remove("hover");
      };
      elements.push(element);
    })(i);
  }

  // Event handlers
  function extractNumber() {
    var v = output.value;
    if (+v !== +v) v = '0';
    if (array.byteLength === 8) return BigInt(v);
    return +v;
  }
  output.onkeydown = function (e) {
    if (e.which === 13) {
      e.preventDefault();
      output.blur();
    } else if (e.which === 38) {
      e.preventDefault();
      var v = extractNumber();
      output.value = reduceNumber(++v);
      output.select();
      output.oninput();
    } else if (e.which === 40) {
      e.preventDefault();
      var v = extractNumber();
      output.value = reduceNumber(--v);
      output.select();
      output.oninput();
    }
  };
  output.onfocus = function () {
    output.select();
  };
  output.oninput = function () {
    array[0] = extractNumber();
    render();
  };
  output.onblur = function () {
    render();
  };

  hex.onkeydown = function (e) {
    if (e.which === 13) {
      e.preventDefault();
      hex.blur();
    }
  };
  hex.onfocus = function () {
    hex.select();
  };
  hex.oninput = function () {
    var hexAlphabet = "0123456789abcdefABCDEF";
    var validHexCharas = hex.value.split("").every(function (c) {
      return hexAlphabet.split("").lastIndexOf(c) !== -1;
    });
    if (hex.value.length > hexLength * 2 || validHexCharas === false) {
      hex.value = hex.value.slice(0, -1);
      return;
    }

    var tmpBytes = toByteArray(hex.value);
    bytes.fill(0);
    bytes.set(tmpBytes.reverse(), hexLength - tmpBytes.length);
    render();
  };
  hex.onblur = function () {
    render();
  };

  input.onmousedown = function (e) {
    if ("index" in e.target.dataset) {
      var index = e.target.dataset.index | 0;
      var byteIndex = bytes.length - (index >> 3) - 1;
      var byteMask = 1 << (7 - (index & 7));
      var mouseDownValue = bytes[byteIndex] & byteMask ? 0 : 1;
      bytes[byteIndex] ^= byteMask;
      render();

      document.onmousemove = function (e2) {
        if ("index" in e2.target.dataset) {
          var index = e2.target.dataset.index | 0;
          var byteIndex = bytes.length - (index >> 3) - 1;
          var byteMask = 1 << (7 - (index & 7));
          bytes[byteIndex] =
            (bytes[byteIndex] & ~byteMask) | (byteMask * mouseDownValue);
          render();
        }
      };

      document.onmouseup = function () {
        document.onmousemove = null;
        document.onmouseup = null;
      };
    }
  };
  leftshift.onmousedown = function () {
    var carry = 0;
    for (var i = 0; i < bytes.length; i++) {
      var v = bytes[i] << 1;
      bytes[i] = v | (carry ? 0x1 : 0x0);
      carry = v & 0x100;
    }
    render();
  }
  rightshift.onmousedown = function () {
    var sign = bytes[bytes.length - 1] & 0x80;
    var carry = 0;
    for (var i = bytes.length - 1; i >= 0; i--) {
      var c = bytes[i] & 1;
      var v = bytes[i] >> 1;
      bytes[i] = v | (carry ? 0x80 : 0x0);
      carry = c;
    }
    if (sign) bytes[bytes.length - 1] |= 0x80;
    render();
  }
  rightrightshift.onmousedown = function () {
    var carry = 0;
    for (var i = bytes.length - 1; i >= 0; i--) {
      var c = bytes[i] & 1;
      var v = bytes[i] >> 1;
      bytes[i] = v | (carry ? 0x80 : 0x0);
      carry = c;
    }
    render();
  }

  // Update loop
  function render() {
    for (var i = 0; i < bytes.length * 8; i++) {
      elements[i].textContent =
        (bytes[bytes.length - (i >> 3) - 1] >> (7 - (i & 7))) & 1;
    }

    // Figure out integer
    var copyBytes = new Uint8Array(bytes);
    var copy =
      bytes.length === 1
        ? new Int8Array(copyBytes.buffer)
        : bytes.length === 2
        ? new Int16Array(copyBytes.buffer)
        : bytes.length === 4
        ? new Int32Array(copyBytes.buffer)
        : new BigInt64Array(copyBytes.buffer);
    var signIndex = bytes.length - 1;
    var signMask = 0x80;
    var sign = copyBytes[signIndex] & signMask;
    copyBytes[signIndex] &= ~signMask;
    var integer = copy[0];

    // Update views according to which input was edited
    if (document.activeElement === hex) {
      var value = array[0];
      output.value = reduceNumber(value);
    } else if (document.activeElement === output) {
      var tmpBytes = bytes.slice().reverse();
      hex.value = toHexString(tmpBytes);
    } else {
      // This branch is for when the individual bits get toggled
      var value = array[0];
      output.value = reduceNumber(value);
      var tmpBytes = bytes.slice().reverse();
      hex.value = toHexString(tmpBytes);
    }

    help.innerHTML =
      '<span class="sign">' +
      (sign ? -(2n ** (BigInt(array.byteLength) * 8n - 1n)) : 0) +
      "</span>" +
      "&nbsp;&nbsp;&plus;&nbsp;&nbsp;" +
      '<span class="integer">' +
      reduceNumber(integer) +
      "</span>";
  }

  function toHexString(byteArray) {
    return Array.from(byteArray, function (byte) {
      return ("0" + byte.toString(16).toUpperCase()).slice(-2);
    }).join("");
  }

  function toByteArray(hexString) {
    var result = [];
    if (hexString.length % 2 == 1) {
      hexString = hexString + "0";
    }
    for (var i = 0; i < hexString.length; i += 2) {
      result.push(parseInt(hexString.substr(i, 2), 16));
    }
    return result;
  }

  render();
}

load(
  new Int8Array([42]),
  document.getElementById("input8"),
  document.getElementById("output8"),
  document.getElementById("help8"),
  document.getElementById("hex8"),
  document.getElementById("leftshift8"),
  document.getElementById("rightshift8"),
  document.getElementById("rightrightshift8")
);
load(
  new Int16Array([42]),
  document.getElementById("input16"),
  document.getElementById("output16"),
  document.getElementById("help16"),
  document.getElementById("hex16"),
  document.getElementById("leftshift16"),
  document.getElementById("rightshift16"),
  document.getElementById("rightrightshift16")
);
load(
  new Int32Array([42]),
  document.getElementById("input32"),
  document.getElementById("output32"),
  document.getElementById("help32"),
  document.getElementById("hex32"),
  document.getElementById("leftshift32"),
  document.getElementById("rightshift32"),
  document.getElementById("rightrightshift32")
);
load(
  new BigInt64Array([42n]),
  document.getElementById("input64"),
  document.getElementById("output64"),
  document.getElementById("help64"),
  document.getElementById("hex64"),
  document.getElementById("leftshift64"),
  document.getElementById("rightshift64"),
  document.getElementById("rightrightshift64")
);
