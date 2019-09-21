"use strict";
var sourceArea = document.getElementById('input');
var memoryArea = document.getElementById('ram');
var alertArea = document.getElementById("alert");
var debugArea = document.getElementById("debug");
var debugVarArea = document.getElementById("debugVariable");
var debugSprArea = document.getElementById("debugSprite");
var memoryPage = 0; //points to one of 255 pages of memory each of 256 bytes to display
var cpuSpeed = 8000; //no of operations in 16ms
var cpuLostCycle = 0; //how many cycles should be lost due to drawing operations
var timerId; //timer to call processor execution
var asmSource; //compiled code
var debugVar = []; //table of data on names and location of variables in memory
var numberDebugString = []; //table showing the correspondence of lines of code to executable instructions
var numberLine = 0; //number of lines of source code
var thisDebugString = 0; //the string that is currently being executed by the processor
var globalJKey = 0; //an array of gamepad buttons
var globalKey = 0; //current button pressed on the keyboard
var obj_wind; //variables used to move windows
var soundTimer = 100; //note playing time
var obj_drag_wind;
var delta_x = 0;
var delta_y = 0;
var file = '';
var isDebug = false;
var debugCallCount = 0;
var tickCount = 0;
var isRedraw = true;
var language = 'eng';
var fileType = 'lge';
var fileName = '';
var fileAuthor = '';
var fileIco = '';
var timerstart = new Date().getTime(),
timertime = 0;

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
setup_mouse("div_wind1", "drag_wind1");
input.onclick = input.onkeydown = input.onkeyup = input.onkeypress = input.oncut = input.onpaste = inputOnKey;

(function () {
	var url = window.location.href.toString();
	if (url.indexOf('?src=') > -1) {
		input.value = 'loading data from gist, please wait';
		var src = url.split('?src=');
		fetch('https://api.github.com/gists/' + src[1])
		.then(function (results) {
			return results.json();
		})
		.then(function (data) {
			var file = '';
			for (var i in data.files) {
				file = data.files[i].content;
				break;
			}
			input.value = file;
			setTimeout(lineCount, 300);
		});
	}
})();

viewCanvas();

function saveIco(a){
	var i = 0;
	var out = [];
	var c = document.getElementById("icon").getContext('2d');
	var palette = [
		"#000000", "#EDE3C7", "#BE3746", "#7FB8B5",
		"#4A3E4F", "#6EA76C", "#273F68", "#DEBB59",
		"#B48D6C", "#42595A", "#C0624D", "#333333",
		"#777777", "#8FAB62", "#3ABFD1", "#bbbbbb"
	];
	a = a.replace(/[{}]/g, '');
	a = a.split(',');
	for(var y = 0; y < 16; y++){
		for(var x = 0; x < 24; x++){
			out.push(parseInt(a[i]) & 0xff);
			c.fillStyle = palette[(parseInt(a[i]) & 0xf0) >> 4];
			c.fillRect(x, y, 1, 1);
			x++;
			c.fillStyle = palette[parseInt(a[i]) & 0xf];
			c.fillRect(x, y, 1, 1);
			i++;
			if(i >= a.length)
				return out;
		}
	}
	return out;	
}

function saveSettings(){
	var s = sourceArea.value;
	fileName = document.getElementById("fileName").value;
	fileAuthor = document.getElementById("fileAuthor").value;
	fileIco = saveIco(document.getElementById("fileIco").value);
	if (document.getElementById('fileTypeChoice2').checked)
		fileType = 'lge';
	else
		fileType = 'bin';
	var settings = {};
	settings.name = fileName;
	settings.author = fileAuthor;
	settings.image = fileIco;
	var sourceSettings = JSON.stringify(settings);
	if(s.search( /\/\*settings\*([\s\S]*?)\*\//i ) > -1){
		sourceArea.value = s.replace( /\/\*settings\*([\s\S]*?)\*\//i, '/*settings*' + sourceSettings + '*/');
	}
	else
		sourceArea.value = '/*settings*' + sourceSettings + '*/\n' + s;
}

function loadSettings(){
	var s = sourceArea.value;
	var fs = s.match( /\/\*settings\*([\s\S]*?)\*\//i );
	if(fs){
		var sourceSettings = fs[1];
		if(sourceSettings.length > 5){
			var settings = JSON.parse(sourceSettings);
			fileName = settings.name;
			fileAuthor = settings.author;
			fileIco = saveIco(settings.image.join(','));
			document.getElementById("fileName").value = fileName;
			document.getElementById("fileAuthor").value = fileAuthor;
			document.getElementById("fileIco").value = fileIco;
		}
	}
}

function setup_mouse(id_div_wind, id_div_drag) {
	if (obj_wind)
		obj_wind.style.zIndex = '0';
	obj_wind = document.getElementById(id_div_wind);
	obj_wind.style.zIndex = '1';
	obj_drag_wind = document.getElementById(id_div_drag);
	obj_drag_wind.onmousedown = save_delta_koor;
	document.onmouseup = clear_delta_koor;
}

function save_delta_koor(obj_evt) {
	var x,
	y;
	if (obj_evt) {
		x = obj_evt.pageX;
		y = obj_evt.pageY;
	} else {
		x = window.event.clientX;
		y = window.event.clientY;

	}
	delta_x = obj_wind.offsetLeft - x;
	delta_y = obj_wind.offsetTop - y;
	document.onmousemove = motion_wind;
}

function clear_delta_koor() {
	document.onmousemove = null;
}

function motion_wind(obj_event) {
	var x,
	y;
	if (obj_event) {
		x = obj_event.pageX;
		y = obj_event.pageY;
	} else {
		x = window.event.clientX;
		y = window.event.clientY;
	}

	if (delta_y + y < 5) {
		obj_wind.style.top = 5 + "px";
	} else {
		obj_wind.style.top = (delta_y + y) + "px";
	}

	if (delta_x + x < 5) {
		obj_wind.style.left = 5 + "px";
	} else {
		obj_wind.style.left = (delta_x + x) + "px";
	}

	window.getSelection().removeAllRanges();
}

function viewDebug(id) {
	var i;
	var x = document.getElementsByClassName("debug");
	for (i = 0; i < x.length; i++) {
		x[i].style.display = "none";
	}
	document.getElementById(id).style.display = "block";
}

function keyDownHandler(e) {
	/*
	Bit[0] – Up (Вверх)
	Bit[1] — Down (Вниз)
	Bit[2] — Left (Влево)
	Bit[3] — Right (Вправо)
	Bit[4] — Select (Выбор)
	Bit[5] — Start (Старт)
	Bit[6] — A
	Bit[7] — B
	 */
	switch (e.keyCode) {
	case 38:
	case 87:
		globalJKey |= 1;
		break;
	case 40:
	case 83:
		globalJKey |= 2;
		break;
	case 37:
	case 65:
		globalJKey |= 4;
		break;
	case 39:
	case 68:
		globalJKey |= 8;
		break;
	case 32: //B - space
		globalJKey |= 32;
		break;
	case 90: //A - Z
		globalJKey |= 16;
		break;
	}
	//globalKey = e.keyCode;
}

function keyUpHandler(e) {
	switch (e.keyCode) {
	case 38:
	case 87:
		globalJKey &= ~1;
		break;
	case 40:
	case 83:
		globalJKey &= ~2;
		break;
	case 37:
	case 65:
		globalJKey &= ~4;
		break;
	case 39:
	case 68:
		globalJKey &= ~8;
		break;
	case 32: //B - space
		globalJKey &= ~32;
		break;
	case 90: //A - Z
		globalJKey &= ~16;
		break;
	}
}

function highliteasm(code) {
	//etcdema backlight
	var comments = []; //collect all the comments
	var strings = []; //collect all the lines
	var res = []; //collect all RegExp
	var all = {
		'C': comments,
		'S': strings,
		'R': res
	};
	var safe = {
		'<': '<',
		'>': '>',
		'&': '&'
	};

	return code
	//Remove comments
	.replace(/([^;]);[^\n]*/g, function (m, f) {
		var l = comments.length;
		comments.push(m);
		return f + '~~~C' + l + '~~~';
	})
	//remove the lines
	.replace(/([^\\])((?:'(?:\\'|[^'])*')|(?:"(?:\\"|[^"])*"))/g, function (m, f, s) {
		var l = strings.length;
		strings.push(s);
		return f + '~~~S' + l + '~~~';
	})
	//select keywords
	.replace(/(mov|ldi|ldial|ldc|sti|stial|stc|pop|popn|push|pushn|jmp|jz|jnz|jc|jnc|call|ret|add|and|sub|mul|div|cmp|inc|dec|ldf|hlt)([^a-z0-9\$_])/gi,
		'<span class="kwrd">$1</span>$2')
	//select brackets
	.replace(/(\(|\))/gi,
		'<span class="gly">$1</span>')
	//return to the place of comments, lines
	.replace(/~~~([CSR])(\d+)~~~/g, function (m, t, i) {
		return '<span class="' + t + '">' + all[t][i] + '</span>';
	})
	//expose line feeds
	.replace(/\n/g, '<br/>')
}

function highlitec() {
	//etcdema backlight
	var code = document.getElementById("help_hl").innerHTML;
	var comments = []; //collect all the comments
	var strings = []; //collect all the lines
	var res = []; //collect all RegExp
	var all = {
		'C': comments,
		'S': strings,
		'R': res
	};
	var safe = {
		'<': '<',
		'>': '>',
		'&': '&'
	};

	document.getElementById("help_hl").innerHTML = code
		//remove comments
		.replace(/([^\/])\/\/[^\n]*/g, function (m, f) {
			var l = comments.length;
			comments.push(m);
			return f + '~~~C' + l + '~~~';
		})
		//remove lines
		.replace(/()(\/\*[\S\s]*?\*\/)/g, function (m, f, s) {
			var l = strings.length;
			strings.push(s);
			return f + '~~~S' + l + '~~~';
		})
		//select keywords
		.replace(/(int|char|void)([^a-z0-9\$_])/gi,
			'<span class="kwrd">$1</span>$2')
		//select brackets
		.replace(/(\(|\))/gi,
			'<span class="gly">$1</span>')
		//return to comments, lines
		.replace(/~~~([CSR])(\d+)~~~/g, function (m, t, i) {
			return '<span class="' + t + '">' + all[t][i] + '</span>';
		})
		//expose line feeds
		.replace(/\n/g, '<br/>')
		.replace(/\t/g, '');
}

highlitec();

//compiling assembler code from input field
function onlyAsm() {
	var s = document.getElementById('input').value;
	var n = s.split('\n').length;
	numberDebugString = [];
	for (var i = 0; i < n; i++)
		numberDebugString.push([i, i, 0]);
	file = asm(s);
	document.getElementById('ram').value = toHexA(file);
}
//compilation of si code from input field
function main() {
	rtttl.play = 0;
	document.getElementById("alert").innerHTML = '';
	var src = document.getElementById('input').value;
	var t = tokenize(src);
	console.log(t);
	var c = compile(t);
	asmSource = '\n' + c.join('\n') + '\n';
	file = asm(asmSource);
	compress(file);
	document.getElementById('disasm').innerHTML = highliteasm(asmSource);
	document.getElementById('ram').value = toHexA(file);
}
//display information about the assembly
function info(s) {
	var out = document.getElementById("alert");
	out.innerHTML += '<b>' + s + '</b><br>';
}

function lineCount() {
	var i = 0,
	pos = 0,
	countStr = '',
	l = 0,
	m = 0;
	var txt = sourceArea.value;
	for (var j = 0; j < txt.length; j++) {
		l++;
		if (txt[j] == '\n') {
			m = Math.max(m, l);
			l = 0;
			countStr += i + '<br>';
			i++;
			numberLine = i;
		}
	}
	m = Math.max(m, l);
	countStr += i + '<br>';
	if (i < 10)
		i = 10;
	if (m < 10)
		m = 10;
	i += 5;
	document.getElementById('line-count').innerHTML = countStr;
	sourceArea.style.height = i * 1.15 + 'em';
	sourceArea.style.width = m * 1 + 'em';
	document.getElementById('line-count').style.height = i * 1.15 + 'em';
	sourceArea.focus();
}
//processor current line highlighting
function highliteLine() {
	var countStr = '';
	for (var i = 0; i <= numberLine; i++) {
		if (i == thisDebugString)
			countStr += '<div class="execLine">' + i + '</div>';
		else
			countStr += i + '<br>';
	}
	document.getElementById('line-count').innerHTML = countStr;
}

function inputOnKey(e) {
	if (e.keyCode === 9) { //TAB key was pressed
		if (e.type == 'keyup')
			return false;
		//get carriage position
		var val = this.value,
		start = this.selectionStart,
		end = this.selectionEnd;
		//set textarea to: text before caret + tab + text after caret
		var txt = val.substring(start, end);
		if (e.shiftKey) {
			txt = txt.replace(/\n\s/g, '\n');
			if (txt[0] == '\t' || txt[0] == ' ')
				txt = txt.substring(1);
			this.value = val.substring(0, start) + txt + val.substring(end);
			this.selectionStart = start;
			this.selectionEnd = start + txt.length;
		} else {
			if (txt.length == 0) {
				this.value = val.substring(0, start) + '\t' + val.substring(end);
				//move the carriage
				this.selectionStart = start + 1;
				this.selectionEnd = start + 1;
			} else {
				txt = txt.replace(/[\n]/g, '\n\t');
				this.value = val.substring(0, start) + '\t' + txt + val.substring(end);
				this.selectionStart = start;
				this.selectionEnd = start + txt.length + 1;
			}

		}
		setTimeout(lineCount, 300);
		//prevent loss of focus
		return false;
	} else if (e.keyCode === 13) {
		if (e.type == 'keyup')
			return false;
		//get the position of the carriage
		var val = this.value,
		start = this.selectionStart,
		end = this.selectionEnd;
		var spc = 0;
		var tb = 0;
		this.value = val.substring(0, start) + '\n' + val.substring(end);
		if (end < val.length && val[end] == '\t')
			end++;
		for (var i = start; i >= 0; i--) {
			if (val[i] == '\n') {
				if (spc > 0 || tb > 0)
					break;
			} else if (val[i] == '\t')
				tb++;
			else if (val[i] == ' ')
				spc++;
			else if (val[i] == '{') {
				tb++;
			}
			spc++;
		}
		var txt = '';
		for (var i = 0; i < tb; i++)
			txt += '\t';
		//move the carriage
		this.value = val.substring(0, start) + '\n' + txt + val.substring(end);
		this.selectionStart = start + txt.length + 1;
		this.selectionEnd = start + txt.length + 1;
		setTimeout(lineCount, 300);
		return false;
	} else if (e.keyCode === 125) {
		if (e.type == 'keyup')
			return false;
		//get the position of the carriage
		var val = this.value,
		start = this.selectionStart,
		end = this.selectionEnd;
		if (start > 0 && val[start - 1] == '\t')
			start--;
		this.value = val.substring(0, start) + '}' + val.substring(end);
		this.selectionStart = start + 1;
		this.selectionEnd = start + 1;
		setTimeout(lineCount, 300);
		return false;
	}
	setTimeout(lineCount, 300);
}

function listing() {
	var d = document.getElementById("div_wind1");
	d.value = asmSource;
	d.style.display = "block";
	d.style.left = "1em";
	d.style.top = "3em";
	var d = document.getElementById("disasm");
	d.value = asmSource;
}

function debugVars() {
	var d = document.getElementById("div_wind3");
	d.style.display = "block";
	d.style.left = window.innerWidth / 5 * 2 + 'px';
	d.style.top = "3em";
	isDebug = true;
}

function viewHelp() {
	var d = document.getElementById("div_wind4");
	d.style.display = "block";
	d.style.left = window.innerWidth / 5 * 3 + 'px';
	d.style.top = "3em";
}

function viewSettings() {
	var d = document.getElementById("div_wind5");
	d.style.display = "block";
	d.style.left = window.innerWidth / 5 * 4 + 'px';
	d.style.top = "3em";
	loadSettings();
}

function viewCanvas() {
	var d = document.getElementById("div_wind6");
	d.style.display = "block";
	d.style.left = window.innerWidth / 5 * 4 + 'px';
	d.style.top = "3em";
//	loadSettings();
}

function closewindow(id) {
	var d = document.getElementById(id);
	if (id == "div_wind3")
		isDebug = false;
	d.style.display = "none";
}

var bpalette = [
	"#000000", "#EDE3C7", "#BE3746", "#7FB8B5",
	"#4A3E4F", "#6EA76C", "#273F68", "#DEBB59",
	"#B48D6C", "#42595A", "#C0624D", "#333333",
	"#777777", "#8FAB62", "#3ABFD1", "#bbbbbb"
];

var palette = [];
var sprtpalette = [];

function viewMemory() {
	var s = '     0 1 2 3 4 5 6 7 8 9 A B C D E F';
	for (var i = 0; i < 256; i++) {
		if (i % 16 == 0)
			s += '\n' + toHex2(memoryPage) + toHex2(Math.floor(i)) + ':';
		s += toHex2(cpu.readMem(memoryPage * 256 + i)) + '';
	}
	document.getElementById('areaMemoryPrewiew').value = s;
}

function setMemoryPage(n) {
	if (n == 'p')
		memoryPage++;
	else if (n == 'm')
		memoryPage--;
	else if (!isNaN(parseInt(n, 16)))
		memoryPage = parseInt(n, 16);
	if (memoryPage > 255)
		memoryPage = 255;
	if (memoryPage < 0)
		memoryPage = 0;
	document.getElementById('memoryPage').value = toHex2(memoryPage);
	viewMemory();
}

function run() {
	//sound is initialized only when the button is pressed
	initAudio();
	//decrease the value of timers
	for (var i = 0; i < 8; i++) {
		timers[i] -= 16;
		if (timers[i] <= 0)
			timers[i] = 0;
	}
	soundTimer -= 16;
	if (soundTimer <= 30)
		soundTimer = playRtttl();
	if (soundTimer > 2000)
		soundTimer = 2000;
	//process processor instructions
	for (var i = 0; i < cpuSpeed; i++) {
		cpu.step();
		i += cpuLostCycle;
		cpuLostCycle = 0;
	}
	//sprite processing
	if (isRedraw) {
		display.clearSprite();
		cpu.redrawSprite();
		cpu.testSpriteCollision(isDebug);
		isRedraw = false;
		//display debugging information
		debugCallCount++;
		if (debugCallCount >= 10) {
			document.getElementById('debug').value = cpu.debug();
			debugCallCount = 0;
		}
	}
	timertime += 16;
	var diff = (new Date().getTime() - timerstart) - timertime;
	clearTimeout(timerId);
	timerId = setTimeout(function () {
			run()
		}, 16 - diff);
}
//screen output function
function Display() {
	var displayArray = [];
	var spriteArray = [];
	var canvasArray = [];
	var canvasArray2 = [];
	var ctx;
	var width;
	var height;
	var pixelSize = 2;

// SH
	var canvas = document.getElementById("screen1");
	var isDebug = false;
	var isDrawKeyboard = false;
	var isChangePalette = false;
	var keyboardPos = 0;
	var keyboardImage = [
		0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x31, 0x17, 0x9c, 0x7d, 0x12, 0x21, 0xe, 0x71, 0xc7, 0xc,
		0x60, 0x84, 0x0, 0x79, 0xe7, 0x84, 0x49, 0x14, 0x12, 0x10, 0xa2, 0x20, 0x11, 0x49, 0x1, 0x8, 0x21, 0x2, 0x1f, 0x9, 0x24, 0x88, 0x49, 0x17,
		0x1c, 0x10, 0x42, 0x21, 0x11, 0x71, 0x1, 0x10, 0x11, 0x2, 0x0, 0x11, 0xe7, 0x9f, 0x49, 0x54, 0x18, 0x10, 0x42, 0x21, 0x11, 0x41, 0x1, 0x8,
		0x21, 0x2, 0x1f, 0x21, 0x20, 0x88, 0x51, 0x54, 0x14, 0x10, 0x42, 0x21, 0x11, 0x41, 0x1, 0x8, 0x21, 0x2, 0x0, 0x21, 0x20, 0x84, 0x28, 0xa7,
		0x92, 0x10, 0x41, 0xc1, 0xe, 0x41, 0xc7, 0xc, 0x60, 0x84, 0x0, 0x21, 0xe7, 0x80, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
		0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x30, 0xe7, 0x1e, 0x39, 0x20, 0x84, 0x90,
		0x41, 0x5, 0x1, 0x28, 0x43, 0x9e, 0x49, 0xe7, 0x85, 0x49, 0x4, 0x90, 0x45, 0x20, 0x85, 0x10, 0x0, 0x5, 0x2, 0x7c, 0xf4, 0x52, 0x49, 0x4, 0x9,
		0x78, 0x84, 0x9c, 0x41, 0xe0, 0x86, 0x10, 0x0, 0x0, 0x4, 0x29, 0x45, 0xd2, 0x79, 0xe7, 0x9f, 0x48, 0x44, 0x90, 0x4d, 0x20, 0x85, 0x10, 0x41,
		0x0, 0x8, 0x28, 0xe5, 0x92, 0x8, 0x24, 0x88, 0x48, 0x24, 0x90, 0x45, 0x22, 0x84, 0x90, 0x1, 0x0, 0x10, 0x7c, 0x54, 0x12, 0x8, 0x24, 0x84, 0x49,
		0xc7, 0x10, 0x39, 0x21, 0x4, 0x9e, 0x0, 0x0, 0x0, 0x29, 0xe3, 0xde, 0x9, 0xe7, 0x80, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
		0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x79, 0x13, 0x11, 0x79, 0x22, 0x21, 0x10, 0x70,
		0x0, 0x10, 0x60, 0x44, 0x40, 0x11, 0xe7, 0x80, 0x8, 0xa4, 0x91, 0x45, 0xa3, 0x62, 0x8, 0x10, 0x0, 0x10, 0x64, 0x42, 0x80, 0x30, 0x20, 0x80, 0x10,
		0x44, 0xa, 0x79, 0x62, 0xa4, 0x4, 0x70, 0x0, 0x10, 0x9, 0xf1, 0x1f, 0x11, 0xe7, 0x9b, 0x20, 0x44, 0xa, 0x45, 0x22, 0x22, 0x8, 0x40, 0x0, 0x10,
		0x10, 0x42, 0x80, 0x11, 0x0, 0x91, 0x40, 0xa4, 0x84, 0x45, 0x22, 0x21, 0x10, 0x0, 0x4, 0x0, 0x2c, 0x44, 0x40, 0x11, 0x0, 0x9b, 0x79, 0x13, 0x4,
		0x79, 0x22, 0x20, 0x0, 0x41, 0x4, 0x10, 0x4c, 0x0, 0x0, 0x39, 0xe7, 0x80, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0
	];

	function init() {
		width = canvas.getBoundingClientRect().width;
		height = canvas.getBoundingClientRect().height;
		ctx = canvas.getContext('2d');
		ctx.imageSmoothingEnabled = false;
		reset();
		canvas.addEventListener('mousemove', function (e) {
			position(e);
		});
	}

	function position(e) {
		var rect = canvas.getBoundingClientRect();
// SH
		var x = Math.floor((e.offsetX == undefined ? e.layerX : e.offsetX) / (rect.width / iW));
		var y = Math.floor((e.offsetY == undefined ? e.layerY : e.offsetY) / (rect.height / (iH + 32))) - 16;
		ctx.fillStyle = "black";
//SH - iX?
		ctx.fillRect(iX2, 0, pixelSize * (iW - iX), pixelSize * 16);
		ctx.fillStyle = "white";
		ctx.fillText("x " + x + "; y " + y, iX + 1, 1);
	}

	function reset() {
		ctx.textAlign = "start";
		ctx.textBaseline = "hanging";
		ctx.font = pixelSize * 8 + "px monospace";
		ctx.fillStyle = "black";
// SH - iX?
		ctx.fillRect(0, 0, width + 20, height + 20);
// SH
		for (var i = 0; i < ((iW - iX) * (iH + 32)); i++) {
			displayArray[i] = 0;
			canvasArray[i] = 0;
			canvasArray2[i] = 0;
		}
		cpuLostCycle += 2000;
		ctx.fillStyle = "black";
// SH - iX?
		ctx.fillRect(iX2, (iH + 16) * pixelSize, pixelSize * (iW - iX), pixelSize * 16);
		ctx.fillStyle = "white";
		ctx.fillText("KEY_A - z, KEY_B - space", iX + 1, (iH + 17) * pixelSize);

		for (var i = 0; i < 16; i++) {
			palette[i] = bpalette[i];
			sprtpalette[i] = bpalette[i];
		}
	}

	function clearScreen(color) {
		if (color === undefined || color === null)
			color = 0;
// SH
		for (var i = 0; i < ((iW - iX) * (iH + 32)); i++) {
			displayArray[i] = color;
			canvasArray[i] = color;
		}
	}

	function clearSprite() {
// SH
		for (var i = 0; i < ((iW - iX) * (iH + 32)); i++) {
			spriteArray[i] = 0;
		}
	}

	function drawLed(color) {
		var r = ((((color >> 11) & 0x1F) * 527) + 23) >> 6;
		var g = ((((color >> 5) & 0x3F) * 259) + 33) >> 6;
		var b = (((color & 0x1F) * 527) + 23) >> 6;
		ctx.fillStyle = fullColorHex(r, g, b);
// SH - iX?
		ctx.fillRect(iX2 * pixelSize, 0, pixelSize * (iW - iX), pixelSize * 16);
		ctx.fillRect(iX2 * pixelSize, (iH + 16) * pixelSize, pixelSize * (iW - iX), pixelSize * 16);
	}

	function char(chr, x, y, color, bgcolor) {
		var c = chr.charCodeAt(0);
		for (var i = 0; i < 5; i++) { // Char bitmap = 5 columns
			var line = font[c * 5 + i];
			for (var j = 0; j < 8; j++, line >>= 1) {
				if (line & 1)
					drawPixel(color, x + i, y + j);
				else
					drawPixel(bgcolor, x + i, y + j);
			}
		}
	}

	function drawTestRect(x, y, w, h, c) {
		if (c == 0)
			ctx.strokeStyle = "pink";
		else
			ctx.strokeStyle = "red";
		ctx.beginPath();
// SH - iX?
		ctx.rect((iX2 + x) * pixelSize, (y + 16) * pixelSize, w * pixelSize, h * pixelSize);
		ctx.stroke();
		isDebug = true;
	}

	function updatePixel(x, y) {
// SH
		canvasArray[x * (iW - iX) + y] = displayArray[x * (iW - iX) + y];
	}

	function drawPixel(color, x, y) {
		cpuLostCycle += 1;
// SH
		if (x >= 0 && x < (iW - iX) && y >= 0 && y < iH)
			canvasArray[x * (iW - iX) + y] = color;
	}

	function drawSpritePixel(color, x, y) {
// SH
		if (x >= 0 && x < (iW - iX) && y >= 0 && y < iH)
			spriteArray[x * (iW - iX) + y] = color;
	}

	function plot(color, x, y) {
// SH
		if (x >= 0 && x < (iW - iX) && y >= 0 && y < iH) {
			drawPixel(color, x, y);
			displayArray[x * (iW - iX) + y] = color & 0x0f;
		}
	}

	function largeplot(color, x, y, s) {
		var x1, y1;
		for (x1 = 0; x1 < s; x1++)
			for (y1 = 0; y1 < s; y1++) {
				drawPixel(color, x + x1, y + y1);
// SH
				displayArray[(x + x1) * (iW - iX) + y + y1] = color & 0x0f;
			}
	}

	function getPixel(x, y) {
// SH
		if (x >= 0 && x <= (iW - iX) - 1 && y >= 0 && y <= iH - 1)
			return displayArray[x * (iW - iX) + y];

		return 0;
	}

	function viewKeyboard(pos) {
		isDrawKeyboard = true;
		keyboardPos = pos;
	}

	function drawKeyboard() {
		var i = 0;
		var bit;
		var adr = 0;
		var px = keyboardPos % 21;
		var py = Math.floor(keyboardPos / 21);
		for (var y = 0; y < 24; y++) {
// SH
			for (var x = 0; x < (iW - iX); x++) {
				if (i % 8 == 0) {
					bit = keyboardImage[adr];
					adr++;
				}
				if (bit & (iW - iX))
					drawSpritePixel(11, x, iH - 24 + y);
				else {
					if (Math.floor(y / 8) == py && Math.floor(x / 6) == px)
						drawSpritePixel(10, x, iH - 24 + y);
					else
						drawSpritePixel(1, x, iH - 24 + y);
				}
				bit = bit << 1;
				i++;
			}
		}
	}

	function redraw() {
		var color, x, y;
		if (isDrawKeyboard) {
			drawKeyboard();
			isDrawKeyboard = 0;
		}
// SH
		for (x = 0; x < (iW - iX); x++) {
			for (y = 0; y < iH; y++) {
				if (spriteArray[x * (iW - iX) + y] > 0) {
					color = spriteArray[x * (iW - iX) + y];
					canvasArray2[x * (iW - iX) + y] = color;
					ctx.fillStyle = sprtpalette[color & 0x0f];
					ctx.fillRect((iX2 + x) * pixelSize, (y + 16) * pixelSize, pixelSize, pixelSize);
				} else if (canvasArray[x * (iW - iX) + y] != canvasArray2[x * (iW - iX) + y] || isDebug || isChangePalette) {
					canvasArray2[x * (iW - iX) + y] = canvasArray[x * (iW - iX) + y];
					color = canvasArray[x * (iW - iX) + y];
					ctx.fillStyle = palette[color & 0x0f];
					ctx.fillRect((iX2 + x) * pixelSize, (y + 16) * pixelSize, pixelSize, pixelSize);
				}
			}
		}

		isDebug = false;
		isChangePalette = false;
	}

	function rgbToHex(rgb) {
		var hex = Number(rgb).toString(16);

		if (hex.length < 2) {
			hex = "0" + hex;
		}

		return hex;
	}

	function fullColorHex(r, g, b) {
		var red = rgbToHex(r);
		var green = rgbToHex(g);
		var blue = rgbToHex(b);
		return '#' + red + green + blue;
	}

	function changePalette(n, color) {
		var r = ((((color >> 11) & 0x1F) * 527) + 23) >> 6;
		var g = ((((color >> 5) & 0x3F) * 259) + 33) >> 6;
		var b = (((color & 0x1F) * 527) + 23) >> 6;
		isChangePalette = true;
		if (n < 16)
			palette[n] = fullColorHex(r, g, b);
		else if (n < 32)
			sprtpalette[n - 16] = fullColorHex(r, g, b);
	}

	return {
		init: init,
		reset: reset,
		clearScreen: clearScreen,
		drawLed: drawLed,
		char: char,
		updatePixel: updatePixel,
		drawPixel: drawPixel,
		drawSpritePixel: drawSpritePixel,
		plot: plot,
		largeplot: largeplot,
		getPixel: getPixel,
		viewKeyboard: viewKeyboard,
		redraw: redraw,
		changePalette: changePalette,
		clearSprite: clearSprite,
		drawTestRect: drawTestRect
	};
}

function redraw() {
	setTimeout(function () {
		requestAnimationFrame(redraw);
		cpu.redrawParticle();
		display.redraw();
		cpu.setRedraw();
		isRedraw = true;
	}, 48);
}

function savebin() {
	var newByteArr = [];
	loadSettings();
	if (fileType == 'lge'){
		if (file.length > 1) {
			var cfile = compress(file);
			if(cfile == false){
				cfile = file;
				newByteArr = [0x6C,0x67,0x65,0x0,0x5];
			}
			else
				newByteArr = [0x6C,0x67,0x65,0x1,0x5];
			if(fileIco && fileIco.length > 0){
				newByteArr[3] += 2;
				newByteArr[4] += 192;
				for(var i = 0; i < 192; i++){
					if(i < fileIco.length)
						newByteArr.push(fileIco[i] & 0xFF);
					else
						newByteArr.push(0);
				}
			}
			if(fileAuthor && fileAuthor.length > 0){
				newByteArr[3] += 4;
				newByteArr[4] += fileAuthor.length;
				for(var i = 0; i < fileAuthor.length; i++)
					newByteArr.push(fileAuthor[i] & 0xFF);
			}
			for (var i = 0; i < cfile.length; i++) {
				newByteArr.push(cfile[i] & 0xFF);
			}
			var newFile = new Uint8Array(newByteArr);
			var blob = new Blob([newFile], {
					type: "charset=iso-8859-1"
				});
			if(fileName.length > 0)
				saveAs(blob, fileName + '.lge');
			else
				saveAs(blob, 'rom.lge');
		}
	}
	else{
		if (file.length > 1) {
			for (var i = 0; i < file.length; i++) {
				newByteArr.push(file[i] & 0xFF);
			}
			var newFile = new Uint8Array(newByteArr);
			var blob = new Blob([newFile], {
					type: "charset=iso-8859-1"
				});
			saveAs(blob, "rom.bin");
		}
	}
}

function compress(file){
	var fpos = 0, epos = 0, lopos = 0, len = 0;
	var out = [];
	var find = function(array, pos) {
		for (var j = Math.max(0, pos - 511); j < pos; j++) {
		  if ((array[j] === array[pos]) && (array[j + 1] === array[pos + 1]) && (array[j + 2] === array[pos + 2]) && (array[j + 3] === array[pos + 3]))
			  return j;
		}
	return -1;
	}
	
	out = file.slice(0, 3);
	out.splice(0,0,0,3);
	lopos = 0;
	for(var i = 3; i < file.length; i++){
		fpos = find(file, i);
		epos = i;
		if(fpos > -1){
			while(i < file.length && file[fpos + len] === file[i] && len < 63){
				len++;
				i++;
			}
			out.push(128 + (len << 1) + ((epos - fpos) >> 8));
			out.push((epos - fpos) & 0xff);
			lopos = out.length;
			out.push(0);
			out.push(0);
			len = 0;
			i--;
		}
		else{
		  out.push(file[i]);
		  out[lopos + 1]++;
			  if(out[lopos + 1] > 255){
				  out[lopos + 1] = 0;
				  out[lopos]++;
			  }
		}
	}
	console.log("compress rate " + Math.round(100 - out.length / file.length * 100) + "%");
	if(!compressTest(file, decompress(out))){
		console.log("error compress");
		console.log(out);
		console.log(file);
		console.log(decompress(out));
		return false;
	}
	return out;
}

function decompress(file){
	var out = [];
	var i = 0, length, position, point;
	while(i < file.length){
		if((file[i] & 128) == 0){
			length = ((file[i] & 127) << 8) + file[i + 1];
			i += 2;
			for( var j = 0; j < length; j ++){
				out.push(file[i]);
				i++;
			}
		}
		else{
			length = (file[i] & 127) >> 1;
			position = (((file[i] & 1) << 8) + file[i + 1]);
			i += 2;
			point = out.length - position;
			for( var j = 0; j < length; j ++){
				out.push(out[point + j]);
			}
		}
	}
	return out;
}

function compressTest(f1, f2){
	if(f1.length != f2.length){
		return false;
	}
	for(var i = 0; i < f1.length; i++){
		if(f1[i] != f2[i]){
			console.log(i, f1[i], f2[i]);
			return false;
		}
	}
	return true;
}

var display = new Display();
display.init();
var spriteEditor = new SpriteEditor();
spriteEditor.init();
lineCount();
redraw();
