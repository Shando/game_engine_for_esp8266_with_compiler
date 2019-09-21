"use strict";
//token breakdown
function tokenize(s) {
	var tokens = [];
	var thisToken = 0;
	var l;
	var lastDefine;
	var tokenReplace = [
		'S_X', 0, 'S_Y', 1, 'S_SPEEDX', 2, 'S_SPEEDY', 3, 'S_WIDTH', 4, 'S_HEIGHT', 5,
		'S_ANGLE', 6, 'S_LIVES', 7, 'S_COLLISION', 8, 'S_SOLID', 9, 'S_GRAVITY', 10,
		'S_ON_COLLISION', 11, 'S_ON_EXIT_SCREEN', 12, 'S_IS_SCROLLED', 13, 'S_IS_ONEBIT', 14,
		'S_FLIP_HORIZONTAL', 15,
		'KEY_UP', 1, 'KEY_LEFT', 4, 'KEY_DOWN', 2, 'KEY_RIGHT', 8, 'KEY_A', 16, 'KEY_B', 32
	];
	//simplified version of #define, just a replacement
	function define(s) {
		lastDefine = [''];
		while (lastDefine.length != 0) {
			lastDefine = [];
			s = s.replace(/#define\s*([^\s]*)\s*([^\n]*)/, function (str, def, repl, offset, s) {
					lastDefine = [def, repl];
					return ' ';
				});
			if (lastDefine.length > 0)
				s = s.replace(new RegExp(lastDefine[0], 'g'), lastDefine[1]);
		}
		return s;
	}

	s = define(s);
	s = s.replace(/#include[^\n]*/g, ''); //removal of inclusions, so as not to interfere
	l = s.length;
	tokens[0] = '';
	for (var i = 0; i < l; i++) {
		switch (s[i]) {
		case '"':
			//line processing
			if (tokens[thisToken] != '')
				thisToken++;
			tokens[thisToken] = s[i++];
			while (i < l && s[i] != '"') {
				tokens[thisToken] += s[i++];
				//special character replacement
				if (s[i] == '\\' && s[i + 1] == '"') {
					tokens[thisToken] += '\\"';
					i += 2;
				}
			}
			tokens[thisToken] += s[i];
			thisToken++;
			tokens[thisToken] = '';
			break;
		case '\'':
			//single character processing
			if (tokens[thisToken] != '')
				thisToken++;
			if (s[i + 2] == '\'') {
				tokens[thisToken] = '' + s.charCodeAt(i + 1);
				thisToken++;
				tokens[thisToken] = '';
				i += 2;
			}
			break;
		case '=':
			if (s[i - 1] == '=' || s[i - 1] == '!' || s[i - 1] == '+' || s[i - 1] == '-' || s[i - 1] == '*' || s[i - 1] == '/') {
				tokens[thisToken - 1] += '=';
				break;
			}
		case '+':
		case '-':
		case '*':
		case '%':
		case '/':
			//if comments, then remove, leaving line feeds
			if (s[i + 1] == '/') {
				while (s[i + 1] != '\n')
					i++;
				break;
			}
			if (s[i + 1] == '*') {
				i += 2;
				while (!(s[i] == '*' && s[i + 1] == '/')) {
					if (s[i] == '\n') {
						if (tokens[thisToken] != '')
							thisToken++;
						tokens[thisToken] = s[i];
						thisToken++;
						tokens[thisToken] = '';
					}
					i++;
					if (i >= l)
						break;
				}
				i++;
				break;
			}
		case '>':
		case '<':
		case '!':
		case '&':
		case '^':
		case '|':
		case '(':
		case ')':
		case '{':
		case '}':
		case '[':
		case ']':
		case ';':
		case '?':
		case ':':
		case ',':
		case '\n':
			if (tokens[thisToken] != '')
				thisToken++;
			tokens[thisToken] = s[i];
			if ((s[i] == '>' || s[i] == '<') && s[i + 1] == '=') {
				i++;
				tokens[thisToken] += s[i];
			}
			if (!(s[i] == '-'
					 && (tokens[thisToken - 1] == '=' || tokens[thisToken - 1] == '(' || tokens[thisToken - 1] == ',' || tokens[thisToken - 1] == '>' || tokens[thisToken - 1] == '<')
					 && s[i + 1] >= '0' && s[i + 1] <= '9')) {
				thisToken++;
				tokens[thisToken] = '';
			}
			break;
		case '\t':
		case ' ':
			//remove extra whitespace characters
			while (l < i && s[i + 1] == ' ')
				i++;
			if (tokens[thisToken] != '') {
				thisToken++;
				tokens[thisToken] = '';
			}
			break;
		default:
			tokens[thisToken] += s[i];
		}
	}
	for (var i = 0; i < tokens.length; i++) {
		var n = tokenReplace.indexOf(tokens[i]);
		if (n > -1 && n % 2 == 0)
			tokens[i] = '' + tokenReplace[n + 1];
	}

	return tokens;
}

function compile(t) {
	var asm = []; //core assembler code
	var dataAsm = []; //assembler code to be added at the end of the main
	var thisTokenNumber = 0; //current token number
	var thisToken; //current token
	var lastToken; //previous token
	var varTable = []; //variable table
	var localVarTable = []; //table of local variables
	var functionTable = []; //table containing the names of the functions and their source code in assembler
	var thisFunction;
	var isIntoFunction = false; //are we in the function body
	var functionVarTable = []; //table of variables specified in the declaration of the current function being processed
	var lineCount = 0; //current line number
	var registerCount = 1; //pointer to the processor register currently in use
	var lastEndString = 0; //pointer to the last token in the previous line
	var labelNumber = 0; //link number, needed to create unique link names
	var localStackLength = 0; //used in functions for working with local variables relative to the stack pointer
	var switchStack = []; //points to the last switch, necessary for processing break

	function putError(line, error, par) {
		var er = 'unknown';
		if (language == 'rus')
			switch (error) {
			case 0:
				er = "функция " + par + " уже была объявлена";
				break;
			case 1:
				er = "функция " + par + " не соответствует прототипу";
			case 2:
				er = "ожидалось определение типа";
				break;
			case 3:
				er = "ожидалась запятая или закрывающая скобка";
				break;
			case 4:
				er = "ожидалась фигурная открывающая скобка";
				break;
			case 5:
				er = "ожидалась закрывающая скобка в функции " + par;
				break;
			case 6:
				er = "ожидался аргумент в функции " + par;
				break;
			case 7:
				er = "ожидалась открывающая скобка в функции " + par;
				break;
			case 8:
				er = "функция " + par + " не может возвращать значение";
				break;
			case 9:
				er = "работа с локальными массивами не поддерживается";
				break;
			case 10:
				er = "не указана длина массива";
				break;
			case 11:
				er = "неправильное объявление массива";
				break;
			case 12:
				er = "неверное количество аргументов";
				break;
			case 13:
				er = "ожидалась открывающая скобка в конструкции " + par;
				break;
			case 14:
				er = "отсутствует конструкция switch";
				break;
			case 15:
				er = "ожидалось двоеточие";
				break;
			case 16:
				er = "ожидалось число";
				break;
			case 17:
				er = "неподдерживаемое объявление переменных";
				break;
			case 18:
				er = "ожидалась скобка";
				break;
			case 19:
				er = "предупреждение, unsigned не реализовано";
				break;
			case 20:
				er = "неизвестный токен " + par;
				break;
			case 21:
				er = "не найдена точка входа в функцию main";
				break;
			}
		else
			switch (error) {
			case 0:
				er = "the " + par + " function has already been declared";
				break;
			case 1:
				er = "the function " + par + " does not match the prototype";
			case 2:
				er = "expected type definition";
				break;
			case 3:
				er = "expected comma or closing bracket";
				break;
			case 4:
				er = "expected curly opening bracket";
				break;
			case 5:
				er = "expected closing bracket in function " + par;
				break;
			case 6:
				er = "expected argument in function " + par;
				break;
			case 7:
				er = "expected opening bracket in function " + par;
				break;
			case 8:
				er = "the function " + par + " cannot return a value";
				break;
			case 9:
				er = "working with local arrays is not supported";
				break;
			case 10:
				er = "array length not specified";
				break;
			case 11:
				er = "invalid array declaration";
				break;
			case 12:
				er = "invalid number of arguments";
				break;
			case 13:
				er = "expected opening bracket in construction " + par;
				break;
			case 14:
				er = "no switch design";
				break;
			case 15:
				er = "colon is expected";
				break;
			case 16:
				er = "expected number";
				break;
			case 17:
				er = "unsupported variable declaration";
				break;
			case 18:
				er = "expected brace";
				break;
			case 19:
				er = "warning, unsigned not implemented";
				break;
			case 20:
				er = "unknown token " + par;
				break;
			case 21:
				er = "main function entry point not found";
				break;
			}
		info("" + line + " " + er);
	}
	//get the next token, return false if the next token does not exist
	function getToken() {
		lastToken = thisToken;
		if (thisTokenNumber < t.length) {
			thisToken = t[thisTokenNumber];
			thisTokenNumber++;
			return true;
		}
		thisToken = false;
		return false;
	}
	//roll back to the previous token
	function previousToken() {
		if (thisTokenNumber > 1) {
			thisTokenNumber--;
			thisToken = t[thisTokenNumber - 1];
			if (thisTokenNumber > 1) {
				lastToken = t[thisTokenNumber - 2];
			} else {
				lastToken = '';
			}
			return true;
		} else
			return false;
	}
	//getting the rank of an operation for the correct order of performing mathematical operations
	function getRangOperation(t) {
		switch (t) {
		case '>':
		case '<':
		case '!':
		case '==':
		case '!=':
		case '<=':
		case '>=':
		case '?':
		case ':':
			return 1;
		case '|':
		case '&':
		case '^':
			return 2;
		case '+':
		case '-':
			return 3;
		case '*':
		case '/':
		case '%':
			return 4;
		}
		return 0;
	}

	//function registration: name, type of returned data, operands, whether a function is declared, source code, whether to insert a function instead of a jump
	function registerFunction(name, ftype, operands, declar, asm, inline, varLength) {
		var pos = -1;
		for (var i = 0; i < functionTable.length; i++) {
			if (functionTable[i].name == name)
				pos = i;
		}
		if (pos >= 0 && functionTable[pos].declar == 1) {
			putError(lineCount, 0, name);
			//info("" + lineCount + " the function " + name + " has already been declared");
		} else if (pos == -1) {
			//function name, return type, operands, whether a function is declared, whether a function is used, function code, whether to insert a function instead of a jump
			functionTable.push({
				name: name,
				type: ftype,
				operands: operands,
				declar: declar,
				use: 0,
				asm: asm,
				inline: inline,
				varLength: varLength
			});
		} else {
			if (!(functionTable[pos].type == ftype)) {
				putError(lineCount, 1, name);
				//info("" + lineCount + " function " + name + " does not match the prototype");
			}
			functionTable[pos].declar = declar;
			functionTable[pos].asm = asm;
			functionTable[pos].varLength = varLength;
		}
	}
	//processing the function met in the code
	function addFunction(type) {
		var name = thisToken;
		var start = 0;
		thisFunction = name;
		localVarTable = [];
		functionVarTable = [];
		registerCount = 1;
		//main is always called, so for now just jump it
		if (name == 'main')
			asm.push('JMP _end_main');
		getToken();
		getToken();
		//add function variables to the table, immediately type, then name, in a row to simplify the search (the name still cannot match the type
		while (thisToken != ')') {
			if (isType(thisToken))
				functionVarTable.push(thisToken);
			else {
				putError(lineCount, 2, '');
				//info("" + lineCount + "expected type definition");
				return false;
			}
			getToken();
			if (!thisToken)
				return;
			if (thisToken == ')' && lastToken == 'void' && functionVarTable.length == 1) {
				functionVarTable = [];
			} else {
				functionVarTable.push(thisToken);
				getToken();
				if (thisToken == '[') {
					getToken();
					getToken();
				}
				if (thisToken == ',')
					getToken();
				else if (thisToken != ')') {
					putError(lineCount, 3, '');
					//info("" + lineCount + "expected comma or closing bracket");
					return false;
				}
			}
		}
		getToken();
		removeNewLine();
		//if a semicolon follows, then the function body will be described later. Register a function so that you can use it
		if (thisToken == ';') {
			registerFunction(name, type, functionVarTable, 0, [], 0, 0);
		}
		//otherwise we process the contents of the function
		else {
			isIntoFunction = true;
			registerFunction(name, type, functionVarTable, 0, [], 0, 0);
			if (thisToken != '{') {
				putError(lineCount, 4, '');
				//info("" + lineCount + "expected curly opening bracket");
				return false;
			}
			//remember the beginning of the assembler code belonging to the function
			start = asm.length;
			asm.push(' ');
			asm.push('_' + name + ':');
			skipBrace();
			asm.push(' RET');
			asm.push(' ');
			//if it is main, indicate the end of the function
			if (name == 'main') {
				registerFunction(name, type, functionVarTable, 1, [], false, localVarTable.length);
				asm.push(' ');
				asm.push('_end_main:');
			}
			//otherwise, we cut out the entire function code from the asm table and save it in the function table. This will allow to add only used functions to the final code.
			else
				registerFunction(name, type, functionVarTable, 1, asm.splice(start, asm.length - start), false, localVarTable.length);
			localVarTable = [];
			isIntoFunction = false;
		}
		thisFunction = '';
	}
	//function code insertion
	function inlineFunction(func) {
		getToken();
		if (thisToken != ')') {
			previousToken();
			while (!(thisToken == ')' || thisToken == ';')) {
				i++;
				getToken();
				if (!thisToken)
					return;
				while (!(thisToken == ',' || thisToken == ')' || thisToken == ';')) {
					execut();
					if (!thisToken)
						return;
					if (getRangOperation(thisToken) > 0)
						execut();
					else if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
						getToken();
				}
				if (i > func.operands.length / 2 && !longArg) {
					putError(lineCount, 3, t);
					//info("" + lineCount + " expected closing bracket in function " + t);
					return false;
				}
			}
		}
		//check the number of arguments declared
		if (i < func.operands.length / 2 && !longArg) {
			putError(lineCount, 6, t);
			//info("" + lineCount + " expected argument in function " + t);
			return false;
		}
		asm.push(func.asm.replace(/[Rr]\%(\d)/g, function (str, reg, offset, s) {
				return 'R' + (registerCount - parseInt(reg));
			}));
		registerCount -= func.operands.length / 2;
		if (func.type != 'void')
			registerCount++;
		getToken();
		if (getRangOperation(thisToken) > 0)
			execut();
		else if (thisToken == ';')
			previousToken();
	}
	//function call processing
	function callFunction(t) {
		var func;
		var longArg = false;
		var operandsCount = 0;
		var pushOnStack = 0;
		//localStackLength = 0;
		var copyLocalStackLength = localStackLength;
		for (var i = 0; i < functionTable.length; i++) {
			if (functionTable[i].name == t) {
				func = functionTable[i];
				break;
			}
		}
		//checking for an indefinite number of arguments
		if (func.operands.length > 0 && func.operands[func.operands.length - 1] == '...')
			longArg = true;
		getToken();
		if (thisToken != '(') {
			if (thisToken == ')' || thisToken == ',') {
				asm.push(' LDI R' + registerCount + ',_' + func.name);
				func.use++;
				registerCount++;
				return;
			} else
				putError(lineCount, 7, t);
			//info("" + lineCount + " expected opening bracket in function " + t);
			return false;
		}
		if (func.inline == true) {
			inlineFunction(func);
			return;
		}
		func.use++;
		i = 0;
		if (registerCount > 1) {
			//if the function should return a value, then we stack on the stack all the values of the registers containing the data, so that the function does not damage them
			if (func.type != 'void') {
				asm.push(' PUSHN R' + (registerCount - 1));
				pushOnStack = registerCount - 1;
				localStackLength += (registerCount - 1);
			} else
				putError(lineCount, 8, func.name);
			//info('' + lineCount + ' function ' + func.name + ' cannot return a value');
		} else
			registerCount++;
		getToken();
		if (thisToken != ')') {
			previousToken();
			while (!(thisToken == ')' || thisToken == ';')) {
				i++;
				getToken();
				if (!thisToken)
					return;
				while (!(thisToken == ',' || thisToken == ')' || thisToken == ';')) {
					execut();
					if (!thisToken)
						return;
					if (getRangOperation(thisToken) > 0)
						execut();
					else if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
						getToken();
				}
				registerCount--;
				operandsCount++;
				asm.push(' PUSH R' + registerCount);
				localStackLength += 1;
				if (i > func.operands.length / 2 && !longArg) {
					putError(lineCount, 5, t);
					//info("" + lineCount + " expected closing bracket in function " + t);
					return false;
				}
			}
		}
		//check the number of arguments declared
		if (i < func.operands.length / 2 && !longArg) {
			putError(lineCount, 6, t);
			//info("" + lineCount + " expected argument in function " + t);
			return false;
		}
		if (longArg)
			asm.push(' LDC R1,' + (operandsCount * 2));
		//free up stack space for variables
		if (func.varLength == 0 && thisFunction == func.name)
			func.varLength = localVarTable.length;
		if (func.varLength > 0) {
			if (func.varLength < 15)
				asm.push(' DEC R0,' + func.varLength);
			else
				asm.push(' LDC R15,' + func.varLength + '\n SUB R0,R15');
		}
		asm.push(' CALL _' + func.name);
		//functions return the value in the first register, transfer to the one we need
		if (func.type != 'void') {
			if (registerCount != 1) {
				asm.push(' MOV R' + registerCount + ',R1');
			}
		}
		//restoring the stack pointer
		if ((operandsCount * 2 + func.varLength) > 0xf)
			asm.push(' LDC R15,' + (operandsCount * 2 + func.varLength) + '\n ADD R0,R15');
		else if ((operandsCount * 2 + func.varLength) > 0)
			asm.push(' INC R0,' + (operandsCount * 2 + func.varLength));
		//we return all the register data from the stack
		if (registerCount > 1) {
			if (pushOnStack > 0)
				asm.push(' POPN R' + pushOnStack);
			localStackLength = 0;
		}
		registerCount++;
		localStackLength = copyLocalStackLength;
		getToken();
		if (getRangOperation(thisToken) > 0)
			execut();
		else if (thisToken == ';')
			previousToken();
	}
	//add a new variable to the table
	function addVar(type) {
		if (isIntoFunction) {
			localVarTable.push(type);
			localVarTable.push(thisToken);
		} else {
			varTable.push({
				name: thisToken,
				type: type,
				length: 1
			});
			asm.push(' _' + thisToken + ' word ? ');
			asm.push(' ');
		}
	}
	//return the type and name of the variable, if one exists
	function getVar(t) {
		for (var i = 0; i < varTable.length; i++) {
			if (varTable[i].name == t)
				return varTable[i];
		}
		return {
			name: 'null',
			type: 'void',
			length: 1
		}
	}
	//process variables whose data is on the stack
	function localVarToken() {
		var type,
		l,
		op;
		var point = false;
		if (lastToken == '*' && registerCount == 1)
			point = true;
		var number = functionVarTable.indexOf(thisToken);
		if (number == -1) {
			number = localVarTable.indexOf(thisToken);
			type = localVarTable[number - 1];
			l = localStackLength * 2 + number + 1; //variable position relative to stack pointer
		} else {
			type = functionVarTable[number - 1];
			//number += localVarTable.length;
			l = localStackLength * 2 + functionVarTable.length + localVarTable.length - number + 1;
		}
		var token = thisToken;
		getToken();
		//if the variable is an array
		if (thisToken == '[') {
			//calculating the array cell number
			while (thisToken != ']') {
				getToken();
				if (!thisToken)
					return;
				execut();
			}
			getToken();
			//load cell array
			if (thisToken != '=') {
				previousToken();
				if (type == 'char' || type == '*char') {
					if (type == '*char' && !point) {
						asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' LDC R' + (registerCount - 1) + ',(R' + (registerCount + 1) + '+R' + (registerCount - 1) + ')');
					} else
						putError(lineCount, 9, '');
					//info("" + lineCount + " work with local arrays is not supported");
				} else {
					if (type == '*int' && !point) {
						asm.push(' LDIAL R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' LDC R' + (registerCount - 1) + ',(R' + (registerCount + 1) + '+R' + (registerCount - 1) + ')');
					} else
						putError(lineCount, 9, '');
					//info("" + lineCount + " work with local arrays is not supported");
				}
			}
			//save cell array
			else {
				getToken();
				execut();
				getToken();
				//if the variable is followed by a mathematical operation, then we continue to translate the code
				if (getRangOperation(thisToken) > 0)
					execut();
				registerCount--;
				if (type == 'char' || type == '*char') {
					if (type == '*char' && !point) {
						asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' STC (R' + (registerCount + 1) + '+R' + (registerCount - 1) + '),R' + registerCount);
					} else {
						putError(lineCount, 9, '');
						//info("" + lineCount + " work with local arrays is not supported");
					}
				} else {
					if (type == '*int' && !point) {
						asm.push(' LDIAL R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' STC (R' + (registerCount + 1) + '+R' + (registerCount - 1) + '),R' + registerCount);
					} else {
						putError(lineCount, 9, '');
						//info("" + lineCount + " work with local arrays is not supported");
					}
				}
				registerCount--;
			}
		}
		//get the value of a variable
		else if (thisToken != '=' && thisToken != '+=' && thisToken != '-=' && thisToken != '*=' && thisToken != '/=') {
			previousToken();
			if (type == 'char')
				asm.push(' LDC R' + registerCount + ',(' + l + '+R0) ;' + token);
			else
				asm.push(' LDI R' + registerCount + ',(' + l + '+R0) ;' + token);
			registerCount++;
		}
		//assign a value to a variable
		else {
			op = thisToken;
			getToken();
			execut();
			if (getRangOperation(thisToken) > 0)
				execut();
			getToken();
			if (getRangOperation(thisToken) > 0)
				execut();
			registerCount--;

			if (op == '+=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
				asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
			} else if (op == '-=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
				asm.push(' SUB R' + (registerCount + 1) + ',R' + registerCount);
				asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
			} else if (op == '*=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
				asm.push(' MUL R' + registerCount + ',R' + (registerCount + 1));
			} else if (op == '/=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
				asm.push(' DIV R' + (registerCount + 1) + ',R' + registerCount);
				asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
			} else
				previousToken();
			//---------
			if (type == 'char')
				asm.push(' STC (' + l + '+R0),R' + registerCount + ' ;' + token);
			else
				asm.push(' STI (' + l + '+R0),R' + registerCount + ' ;' + token);

		}
	}
	//converting a string to a format understandable to assembler, with the replacement of special characters with their numeric code
	function pushString() {
		var s = '';
		while (thisToken[0] == '"') {
			for (var i = 0; i < thisToken.length; i++) {
				if (thisToken[i] == ';') {
					s += '",59,"';
				} else if (thisToken[i] == '\\') {
					i++;
					if (thisToken[i] == '\\')
						s += '",92,"';
					else if (thisToken[i] == 'n')
						s += '",10,"';
					else if (thisToken[i] == 't')
						s += '",9,"';
					else if (thisToken[i] == '"')
						s += '",34,"';
				} else
					s += thisToken[i];
			}
			getToken();
			removeNewLine();
			s += ',';
		}
		previousToken();
		//dataAsm is inserted into the asm table after compilation is complete
		dataAsm.push('DB ' + s + '0');
		dataAsm.push(' ');
	}
	//add an array
	function addArray(type) {
		var name = lastToken;
		var length = 1;
		var buf = '';
		getToken();
		//number of items not specified
		if (thisToken == ']') {
			getToken();
			if (thisToken != '=')
				putError(lineCount, 10, '');
				//info("" + lineCount + " the length of the array is not specified");
			else
				getToken();
			//an array is a string of characters
			if (thisToken[0] == '"') {
				length = thisToken.length - 2;
				dataAsm.push(' ');
				dataAsm.push('_' + name + ':');
				pushString();
				varTable.push({
					name: name,
					type: type,
					length: length
				});
			}
			//the array is already filled, count the number of elements
			else if (thisToken == '{') {
				while (thisToken && thisToken != '}') {
					getToken();
					removeNewLine();
					if (!thisToken)
						return;
					if (isNumber(parseInt(thisToken)))
						buf += parseInt(thisToken) + ',';
					else if (isVar(thisToken))
						buf += '_' + thisToken + ',';
					else
						buf += '0,';
					length++;
					getToken();
					removeNewLine();
					if (!(thisToken == '}' || thisToken == ','))
						putError(lineCount, 11, '');
					//info("" + lineCount + " invalid array declaration");
				}
				if (type == 'int') {
					dataAsm.push('_' + name + ': \n DW ' + buf.substring(0, buf.length - 1));
					dataAsm.push(' ');
				} else if (type == 'char') {
					dataAsm.push('_' + name + ': \n DB ' + buf.substring(0, buf.length - 1));
					dataAsm.push(' ');
				}
				varTable.push({
					name: name,
					type: type,
					length: length
				});
			}
		}
		//number of items indicated
		else if (isNumber(thisToken)) {
			length = thisToken * 1 + 1;
			var newArr = '';
			if (type == 'char')
				newArr = (' _' + name + ' byte ' + length + ' dup(?)');
			else
				newArr = (' _' + name + ' word ' + length + ' dup(?)');
			varTable.push({
				name: name,
				type: type,
				length: length
			});
			getToken();
			if (thisToken != ']')
				putError(lineCount, 11, '');
			//info("" + lineCount + " invalid array declaration");
			getToken();
			if (thisToken == '=') {
				getToken();
				if (thisToken != '{')
					putError(lineCount, 11, '');
				var nlength = 1;
				while (thisToken && thisToken != '}') {
					getToken();
					removeNewLine();
					if (!thisToken)
						return;
					if (isNumber(parseInt(thisToken)))
						buf += parseInt(thisToken) + ',';
					else if (isVar(thisToken))
						buf += '_' + thisToken + ',';
					else
						buf += '0,';
					nlength++;
					getToken();
					removeNewLine();
					if (!(thisToken == '}' || thisToken == ','))
						putError(lineCount, 11, '');
					//info("" + lineCount + " invalid array declaration");
				}
				if (type == 'int')
					newArr = ('_' + name + ': \n DW ' + buf.substring(0, buf.length - 1));
				else if (type == 'char')
					newArr = ('_' + name + ': \n DB ' + buf.substring(0, buf.length - 1));
				if (nlength < length) {
					console.log(nlength);
					for (var i = nlength; i <= length; i++)
						newArr += ',0';
				} else
					length = nlength;
				varTable.push({
					name: name,
					type: type,
					length: length
				});
			}
			dataAsm.push(newArr);
			dataAsm.push(' ');
		} else
			putError(lineCount, 11, '');
		//info("" + lineCount + " invalid array declaration");
	}
	//checking if token t is a function
	function isFunction(t) {
		for (var i = 0; i < functionTable.length; i++) {
			if (functionTable[i].name == t)
				return true;
		}
		return false;
	}
	//checking if token t is a variable
	function isVar(t) {
		for (var i = 0; i < varTable.length; i++) {
			if (varTable[i].name == t)
				return true;
		}
		return false;
	}
	//checking if the token t is a type declaration
	function isType(t) {
		if (t == 'int' || t == 'char' || t == 'void')
			return true;
		if (t == '*int' || t == '*char' || t == '*void')
			return true;
		return false;
	}
	//checking if token t is a number
	function isNumber(t) {
		return !isNaN(parseFloat(t)) && isFinite(t);
	}
	//process the variable
	function varToken() {
		var v = getVar(thisToken);
		var point = false;
		var op;
		var thisLine = lineCount;
		if (lastToken == '*' && registerCount == 1)
			point = true;
		getToken();
		//if the variable is an array
		if (thisToken == '[') {
			//calculating the array cell number
			getToken();
			while (thisToken != ']') {
				if (!thisToken) {
					putError(thisLine, 18, '');
					return;
				}
				execut();
				if (getRangOperation(thisToken) == 0 && thisToken != ']') {
					getToken();
					execut();
				}
			}
			getToken();
			//load cell array
			if (thisToken != '=' && thisToken != '+=' && thisToken != '-=' && thisToken != '*=' && thisToken != '/=') {
				previousToken();
				if (v.type == 'char' || v.type == '*char') {
					if (v.type == '*char' && !point) {
						asm.push(' LDI R' + registerCount + ',(_' + v.name + ')');
						asm.push(' LDC R' + (registerCount - 1) + ',(R' + registerCount + '+R' + (registerCount - 1) + ')');
					} else
						asm.push(' LDC R' + (registerCount - 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
				} else {
					if (v.type == '*int' && !point) {
						//asm.push(' LDC R15,2 \n MUL R' + (registerCount - 1) + ',R15');
						asm.push(' LDIAL R' + registerCount + ',(_' + v.name + ')');
						asm.push(' LDI R' + (registerCount - 1) + ',(R' + registerCount + '+R' + (registerCount - 1) + ')');
					} else {
						//asm.push(' LDC R15,2 \n MUL R' + (registerCount - 1) + ',R15');
						//asm.push(' LDI R' + (registerCount - 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
						asm.push(' LDIAL R' + (registerCount - 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
					}
				}
			}
			//save cell array
			else {
				op = thisToken;
				getToken();
				execut();
				getToken();
				//if the variable is followed by a mathematical operation, then we continue to translate the code
				if (getRangOperation(thisToken) > 0)
					execut();
				registerCount--;
				if (v.type == 'char' || v.type == '*char') {
					if (v.type == '*char' && !point) {
						asm.push(' LDI R' + (registerCount + 1) + ',(_' + v.name + ')');
						asm.push(' STC (R' + (registerCount + 1) + '+R' + (registerCount - 1) + '),R' + registerCount);
					} else {
						if (op == '+=') {
							asm.push(' LDC R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
						} else if (op == '-=') {
							asm.push(' LDC R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' SUB R' + (registerCount + 1) + ',R' + registerCount);
							asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
						} else if (op == '*=') {
							asm.push(' LDC R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' MUL R' + registerCount + ',R' + (registerCount + 1));
						} else if (op == '/=') {
							asm.push(' LDC R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' DIV R' + (registerCount + 1) + ',R' + registerCount);
							asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
						}
						asm.push(' STC (_' + v.name + '+R' + (registerCount - 1) + '),R' + registerCount);
					}
				} else {
					if (v.type == '*int' && !point) {
						//asm.push(' LDC R15,2 \n MUL R' + (registerCount - 1) + ',R15');
						asm.push(' LDIAL R' + (registerCount + 1) + ',(_' + v.name + ')');
						asm.push(' STI (R' + (registerCount + 1) + '+R' + (registerCount - 1) + '),R' + registerCount);
					} else {
						//asm.push(' LDC R15,2 \n MUL R' + (registerCount - 1) + ',R15');
						if (op == '+=') {
							asm.push(' LDI R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
						} else if (op == '-=') {
							asm.push(' LDI R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' SUB R' + (registerCount + 1) + ',R' + registerCount);
							asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
						} else if (op == '*=') {
							asm.push(' LDI R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' MUL R' + registerCount + ',R' + (registerCount + 1));
						} else if (op == '/=') {
							asm.push(' LDI R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' DIV R' + (registerCount + 1) + ',R' + registerCount);
							asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
						}
						//asm.push(' STI (_' + v.name + '+R' + (registerCount - 1) + '),R' + registerCount);
						asm.push(' STIAL (_' + v.name + '+R' + (registerCount - 1) + '),R' + registerCount);
					}
				}
				registerCount--;
			}
		}
		//load variable value
		else if (thisToken != '=' && thisToken != '+=' && thisToken != '-=' && thisToken != '*=' && thisToken != '/=') {
			previousToken();
			if (v.length > 1) {
				asm.push(' LDI R' + registerCount + ',_' + thisToken);
			} else if (v.type == 'char' || v.type == '*char') {
				asm.push(' LDC R' + registerCount + ',(_' + thisToken + ')');
			} else {
				asm.push(' LDI R' + registerCount + ',(_' + thisToken + ')');
			}
			registerCount++;
		}
		//assigning a value to a variable
		else
			assigment();
	}
	//function return processing
	function returnToken() {
		registerCount = 2;
		while (thisToken != ';') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		registerCount--;
		asm.push(' MOV R1,R' + registerCount);
		registerCount--;
		if (registerCount > 1) {
			putError(lineCount, 12, '');
			//info("" + lineCount + " invalid number of arguments");
		}
		registerCount == 1;
		asm.push(' RET ');
		asm.push(' ');
	}
	//assigning a value to a variable
	function assigment() {
		var variable = lastToken;
		var op = thisToken;
		registerCount = 2;
		if (localVarTable.indexOf(variable) > -1) {
			previousToken();
			localVarToken();
		} else {
			getToken();
			execut();
			if (getRangOperation(thisToken) > 0)
				execut();
			getToken();
			if (getRangOperation(thisToken) > 0)
				execut();
			registerCount--;
			if (op == '+=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(_' + variable + ')');
				asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
			} else if (op == '-=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(_' + variable + ')');
				asm.push(' SUB R' + (registerCount + 1) + ',R' + registerCount);
				asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
			} else if (op == '*=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(_' + variable + ')');
				asm.push(' MUL R' + registerCount + ',R' + (registerCount + 1));
			} else if (op == '/=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(_' + variable + ')');
				asm.push(' DIV R' + (registerCount + 1) + ',R' + registerCount);
				asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
			}
			asm.push(' STI (_' + variable + '),R' + registerCount);
		}
		previousToken();
	}
	//addition / subtraction / decrement / increment processing
	function addSub() {
		var variable = lastToken;
		var operation = thisToken;
		getToken();
		//if increment
		if (thisToken == '+' && operation == '+') {
			//if increment follows variable (var ++)
			if (isVar(variable) || localVarTable.indexOf(variable) > -1 || functionVarTable.indexOf(variable) > -1) {
				if (localVarTable.indexOf(variable) > -1) {
					if (registerCount == 1) {
						asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + localVarTable.indexOf(variable) + 1) + '+R0)');
						registerCount++;
					}
					asm.push(' MOV R' + registerCount + ',R' + (registerCount - 1));
					asm.push(' INC R' + registerCount);
					asm.push(' STI (' + (localStackLength * 2 + localVarTable.indexOf(variable) + 1) + '+R0),R' + registerCount);
				} else if (isVar(variable))
					asm.push(' INC _' + variable);
			}
			//if the variable follows the increment (++ var)
			else {
				getToken();
				if (localVarTable.indexOf(thisToken) > -1) {
					asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + localVarTable.indexOf(thisToken) + 1) + '+R0)');
					asm.push(' INC R' + registerCount);
					asm.push(' STI (' + (localStackLength * 2 + localVarTable.indexOf(thisToken) + 1) + '+R0),R' + registerCount);
					registerCount++;
				} else if (isVar(thisToken)) {
					asm.push(' INC _' + thisToken);
					execut();
				}
			}
			getToken();
		}
		//if decrement
		else if (thisToken == '-' && operation == '-') {
			if (isVar(variable) || localVarTable.indexOf(variable) > -1 || functionVarTable.indexOf(variable) > -1) {
				if (localVarTable.indexOf(variable) > -1) {
					if (registerCount == 1) {
						asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + localVarTable.indexOf(variable) + 1) + '+R0)');
						registerCount++;
					}
					asm.push(' MOV R' + registerCount + ',R' + (registerCount - 1));
					asm.push(' DEC R' + registerCount);
					asm.push(' STI (' + (localStackLength * 2 + localVarTable.indexOf(variable) + 1) + '+R0),R' + registerCount);
				} else if (isVar(variable))
					asm.push(' DEC _' + variable);
			} else {
				getToken();
				if (localVarTable.indexOf(thisToken) > -1) {
					asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + localVarTable.indexOf(thisToken) + 1) + '+R0)');
					asm.push(' DEC R' + registerCount);
					asm.push(' STI (' + (localStackLength * 2 + localVarTable.indexOf(thisToken) + 1) + '+R0),R' + registerCount);
					registerCount++;
				} else if (isVar(thisToken)) {
					asm.push(' DEC _' + thisToken);
					execut();
				}
			}
			getToken();
		} else {
			execut();
			if (getRangOperation(thisToken) == 0)
				if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
					getToken();
			//if the next operation is higher in rank, then we immediately execute it
			if (getRangOperation(thisToken) > 3)
				execut();
			registerCount--;
			if (operation == '+')
				asm.push(' ADD R' + (registerCount - 1) + ',R' + registerCount);
			else if (operation == '-')
				asm.push(' SUB R' + (registerCount - 1) + ',R' + registerCount);
			if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
				execut();
		}
	}
	//division, multiplication, remainder
	function divMul() {
		var operation = thisToken;
		getToken();
		execut();
		if (getRangOperation(thisToken) == 0)
			if (!(thisToken == ',' || thisToken == ')' || thisToken == ';' || thisToken == '?'))
				getToken();
		//if the next operation is higher in rank, then we immediately execute it
		if (getRangOperation(thisToken) > 4)
			execut();
		registerCount--;
		if (operation == '*')
			asm.push(' MUL R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '/')
			asm.push(' DIV R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '%')
			asm.push(' DIV R' + (registerCount - 1) + ',R' + registerCount + ' \n MOV R' + (registerCount - 1) + ',R' + registerCount);
		if (!(thisToken == ',' || thisToken == ')' || thisToken == ';' || thisToken == '?'))
			execut();
	}
	//& | ^
	function andOrXor() {
		var operation = thisToken;
		getToken();
		if (thisToken == operation) {
			operation += thisToken;
			getToken();
		}
		execut();
		if (getRangOperation(thisToken) == 0)
			if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
				getToken();
		//if the next operation is higher in rank, then we immediately execute it
		if (getRangOperation(thisToken) > 2)
			execut();
		if (operation.length > 1)
			execut();
		registerCount--;
		if (operation == '&')
			asm.push(' AND R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '|')
			asm.push(' OR R' + (registerCount - 1) + ',R' + registerCount);
		if (operation == '&&')
			asm.push(' ANDL R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '||')
			asm.push(' ORL R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '^')
			asm.push(' XOR R' + (registerCount - 1) + ',R' + registerCount);
		if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
			execut();
	}
	//comparison
	function compare() {
		var operation = thisToken;
		getToken();
		//if the next token is an operation, then it can be ==, <=,> =,! =
		if (getRangOperation(thisToken) == 1) {
			operation += thisToken;
			getToken();
		}
		execut();
		getToken();
		if (getRangOperation(thisToken) > 1)
			execut();
		else
			previousToken();
		registerCount--;
		if (operation == '>')
			asm.push(' CMP R' + (registerCount - 1) + ',R' + registerCount + '\n LDF R' + (registerCount - 1) + ',3');
		else if (operation == '<')
			asm.push(' CMP R' + (registerCount - 1) + ',R' + registerCount + '\n LDF R' + (registerCount - 1) + ',2');
		else if (operation == '==')
			asm.push(' CMP R' + (registerCount - 1) + ',R' + registerCount + '\n LDF R' + (registerCount - 1) + ',1');
		else if (operation == '!=')
			asm.push(' CMP R' + (registerCount - 1) + ',R' + registerCount + '\n LDF R' + (registerCount - 1) + ',5');
		else if (operation == '<=')
			asm.push(' CMP R' + (registerCount - 1) + ',R' + registerCount + '\n LDF R' + (registerCount - 1) + ',4');
		else if (operation == '>=')
			asm.push(' CMP R' + registerCount + ',R' + (registerCount - 1) + '\n LDF R' + (registerCount - 1) + ',4');
		else if (operation == '>>')
			asm.push(' SHR R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '<<')
			asm.push(' SHL R' + (registerCount - 1) + ',R' + registerCount);
		else
			return false;
		if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
			getToken();
		if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
			execut();
	}
	//conditional branch processing
	function ifToken() {
		//labe makes links unique
		var labe = labelNumber;
		labelNumber++;
		getToken();
		if (thisToken != '(')
			putError(lineCount, 13, 'if');
		//info("" + lineCount + " expected opening bracket in the if construct");
		skipBracket();
		removeNewLine();
		registerCount--;
		asm.push(' CMP R' + registerCount + ',0 \n JZ end_if_' + labe);
		getToken();
		removeNewLine();
		//if the opening brace skips the block of these brackets
		if (thisToken == '{') {
			skipBrace();
		}
		//otherwise just execute to the end of the line
		else {
			execut();
			if (isVar(thisToken)) {
				getToken();
				execut();
			}
			if (thisToken == ')')
				getToken();
		}
		registerCount = 1;
		getToken();
		removeNewLine();
		//processing else
		if (thisToken == 'else') {
			asm.push('JMP end_else_' + labe);
			asm.push('end_if_' + labe + ':');
			getToken();
			execut();
			asm.push('end_else_' + labe + ':');
		} else {
			asm.push('end_if_' + labe + ':');
			previousToken();
		}
	}

	function whileToken() {
		var labe = labelNumber;
		labelNumber++;
		getToken();
		if (thisToken != '(')
			putError(lineCount, 13, 'while');
		//info("" + lineCount + " expected opening bracket in the while construct");
		asm.push('start_while_' + labe + ':');
		skipBracket();
		registerCount--;
		asm.push(' CMP R' + registerCount + ',0 \n JZ end_while_' + labe);
		getToken();
		removeNewLine();
		if (thisToken == '{') {
			skipBrace();
		} else {
			execut();
			if (isVar(thisToken)) {
				getToken();
				execut();
			}
			if (thisToken == ')')
				getToken();
		}
		registerCount = 1;
		getToken();
		removeNewLine();
		asm.push(' JMP start_while_' + labe + ' \nend_while_' + labe + ':');
		previousToken();
	}

	function forToken() {
		var labe = labelNumber;
		var startToken;
		var memToken;
		var bracketCount = 0;
		labelNumber++;
		getToken();
		removeNewLine();
		if (thisToken != '(')
			putError(lineCount, 13, 'for');
		//info("" + lineCount + " expected opening bracket in the for construct");
		//process the part to the first semicolon, this will be done only once
		while (thisToken != ';') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		registerCount = 1;
		getToken();
		//check will be performed every iteration
		asm.push('start_for_' + labe + ':');
		execut();
		while (thisToken != ';') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		registerCount--;
		asm.push(' CMP R' + registerCount + ',0 \n JZ end_for_' + labe);
		//remember the third parameter if, not translating, it will be executed at the end of the loop
		startToken = thisTokenNumber;
		while (!(thisToken == ')' && bracketCount == 0)) {
			if (thisToken == '(')
				bracketCount++;
			else if (thisToken == ')')
				bracketCount--;
			getToken();
			if (!thisToken)
				return;
		}
		getToken();
		removeNewLine();
		if (thisToken == '{') {
			skipBrace();
		} else {
			execut();
			if (isVar(thisToken)) {
				getToken();
				execut();
			}
		}
		//now broadcast the third parameter
		memToken = thisTokenNumber;
		thisTokenNumber = startToken;
		registerCount = 1;
		getToken();
		skipBracket();
		//and restore the broadcast position
		thisTokenNumber = memToken;
		asm.push(' JMP start_for_' + labe + ' \nend_for_' + labe + ':');
		registerCount = 1;
	}

	function ternaryToken(){
		var labe = labelNumber;
		var saveRegCount;
		labelNumber += 2;
		registerCount--;
		asm.push(' CMP R' + registerCount + ',0 \n JZ end_ternary_' + labe);
		saveRegCount = registerCount;

		while (thisToken != ':') {
			getToken();

			if (!thisToken)
				return;

			execut();
		}

		asm.push(' JMP end_ternary_' + (labe + 1) + ':');
		asm.push('end_ternary_' + labe + ':');
		registerCount = saveRegCount;
		getToken();
		execut();
		asm.push('end_ternary_' + (labe + 1) + ':');
	}

	function switchToken() {
		var labe = labelNumber;
		labelNumber++;
		getToken();
		if (thisToken != '(')
			putError(lineCount, 13, 'switch');
		//info("" + lineCount + " expected opening bracket in the switch construct");
		skipBracket();
		registerCount--;
		//leave an empty cell in the asm table and remember its position, here we will add all the code generated by case
		switchStack.push({
			block: asm.length,
			labe: labe
		});
		asm.push(' ');
		asm.push(' JMP end_switch_' + labe);
		getToken();
		removeNewLine();
		if (thisToken == '{') {
			skipBrace();
		} else {
			putError(lineCount, 13, 'switch');
			//info("" + lineCount + " expected opening curly bracket in the switch structure");
		}
		asm.push('end_switch_' + labe + ':');
		switchStack.pop();
		getToken();
		removeNewLine();
	}

	function caseToken() {
		var lastSwitch = {
			block: 0,
			labe: 0
		};
		var labe = labelNumber;
		labelNumber++;
		//look for which switch this case refers to
		if (switchStack.length > 0)
			lastSwitch = switchStack[switchStack.length - 1];
		else
			putError(lineCount, 14, '');
		//info("" + lineCount + " missing switch construct");
		getToken();
		if (isNumber(thisToken)) {
			asm[lastSwitch.block] += 'CMP R1,' + parseInt(thisToken) + ' \n JZ case_' + labe + '\n ';
			asm.push(' case_' + labe + ':');
			getToken();
			if (thisToken != ':')
				putError(lineCount, 15, '');
			//info("" + lineCount + " a colon was expected");
		} else {
			putError(lineCount, 16, '');
			//info("" + lineCount + " expected number");
		}
	}

	function defaultToken() {
		var lastSwitch = {
			block: 0,
			labe: 0
		};
		var labe = labelNumber;
		labelNumber++;
		if (switchStack.length > 0)
			lastSwitch = switchStack[switchStack.length - 1];
		else
			putError(lineCount, 14, '');
		//info("" + lineCount + " missing switch construct");
		getToken();
		if (thisToken != ':')
			putError(lineCount, 15, '');
		//info("" + lineCount + " a colon was expected");
		asm[lastSwitch.block] += 'JMP default_' + labe + '\n ';
		asm.push(' default_' + labe + ':');
	}
	//break at the moment only works to interrupt the switch, you need to refine
	function breakToken() {
		var lastSwitch = {
			block: 0,
			labe: 0
		};
		if (switchStack.length > 0) {
			lastSwitch = switchStack[switchStack.length - 1];
			asm.push(' JMP end_switch_' + lastSwitch.labe);
		} else
			putError(lineCount, 14, '');
		//info("" + lineCount + " missing switch construct");
	}
	//processing a type declaration, assuming it is followed by a variable or function declaration
	function typeToken() {
		var type = thisToken;
		if (lastToken == '*')
			type = '*' + type;
		getToken();
		removeNewLine();
		if (thisToken == '*' || thisToken == '&') {
			if (thisToken == '*')
				type = thisToken + type;
			getToken();
		}
		//type cast, not implemented
		if (thisToken == ')') {
			getToken();
			execut();
			return;
		}
		getToken();
		//call function registration
		if (thisToken == '(') {
			previousToken();
			addFunction(type);
		} else if (thisToken == '[') {
			addArray(type);
		}
		//declaration of variables of the same type, separated by commas, assignment is not supported
		else if (thisToken == ',') {
			previousToken();
			addVar(type);
			getToken();
			while (thisToken && thisToken != ';') {
				getToken();
				addVar(type);
				getToken();
				if (!(thisToken == ',' || thisToken == ';'))
					putError(lineCount, 17, '');
				//info("" + lineCount + " unsupported variable declaration");
			}
		} else {
			previousToken();
			addVar(type);
		}
	}
	//processing of pointers, does not comply with the standard
	function pointerToken() {
		if (thisToken == '&') {
			getToken();
			if (functionVarTable.indexOf(thisToken) > 0) {
				asm.push(' MOV R' + registerCount + ',R0 \n LDC R' + (registerCount + 1) + ',' + (functionVarTable.indexOf(thisToken) * 2));
				asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
				registerCount++;
			} else if (isVar(thisToken)) {
				asm.push(' LDI R' + registerCount + ',_' + thisToken);
				registerCount++;
			}
		} else if (thisToken == '*') {
			getToken();
			if (functionVarTable.indexOf(thisToken) > 0) {
				asm.push(' LDI R' + registerCount + ',(' + localStackLength * 2 + functionVarTable.length - functionVarTable.indexOf(thisToken) + 1 + '+R0) ;' + thisToken);
				asm.push(' LDI R' + registerCount + ',(R' + registerCount + ')');
				registerCount++;
			} else if (isVar(thisToken)) {
				asm.push(' LDI R' + registerCount + ',(_' + thisToken + ')');
				asm.push(' LDI R' + registerCount + ',(R' + registerCount + ')');
				registerCount++;
			}
		}
	}
	//line processing. Adds a line and leaves a link to it in the register
	function stringToken() {
		var labe = labelNumber;
		labelNumber++;
		dataAsm.push('_str' + labe + ':');
		pushString();
		asm.push(' LDI R' + registerCount + ',_str' + labe);
		registerCount++;
	}
	//delete line feed, if any
	function removeNewLine() {
		var s;
		if (thisToken == '\n') {
			if (lastToken == ';')
				registerCount = 1;
			if (thisTokenNumber - lastEndString > 1) {
				//add debugging information
				numberDebugString.push([asm.length, lineCount, 0]);
				//add comments to the asm table for debugging
				s = ';' + lineCount + ' ' + t.slice(lastEndString, thisTokenNumber - 1).join(' ').replace(/\r|\n/g, '');
				if (s.length > 40)
					s = s.substring(0, 40) + '...';
				s = s + "\n";
				asm.push(s);
			}
			//skip all subsequent empty line breaks
			while (thisToken === '\n') {
				lineCount++;
				lastEndString = thisTokenNumber;
				getToken();
			}
		}
	}
	//we execute the block of brackets
	function skipBracket() {
		while (thisToken && thisToken != ')') {
			if (getRangOperation(thisToken) == 0)
				getToken();
			if (!thisToken)
				return;
			execut();
		}
		removeNewLine();

	}
	//we execute a block of curly brackets
	function skipBrace() {
		while (thisToken && thisToken != '}') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		getToken();
		if (thisToken != ';')
			previousToken();
		removeNewLine();
		registerCount = 1;
	}
	//determination of the type of token and the necessary operation
	function execut() {
		//exit if tokens run out
		if (!thisToken) {
			return;
		}
		removeNewLine();
		if (isType(thisToken)) {
			typeToken();
		} else if (functionVarTable.indexOf(thisToken) > 0 || localVarTable.indexOf(thisToken) > 0) {
			localVarToken();
		} else if (isVar(thisToken)) {
			varToken();
		} else if (isFunction(thisToken)) {
			callFunction(thisToken);
		} else if (isNumber(thisToken)) {
			thisToken = '' + parseInt(thisToken);
			//the byte code for adding an eight-bit number will be shorter by two bytes, if possible we add it
			if ((thisToken * 1) < 255 && (thisToken * 1) >= 0)
				asm.push(' LDC R' + registerCount + ',' + thisToken);
			else
				asm.push(' LDI R' + registerCount + ',' + thisToken);
			registerCount++;
		} else if (getRangOperation(thisToken) > 0) {
			//in these conditions, work with pointers is most likely, but this is not always the case, it is necessary to improve
			if (thisToken == '&' && (lastToken == '(' || lastToken == '=' || lastToken == ','))
				pointerToken();
			else if (thisToken == '*' && (lastToken == '(' || lastToken == '=' || lastToken == ','))
				pointerToken();
			else if (thisToken == '*' && registerCount == 1) {
				getToken();
				execut();
			} else if (thisToken == '+' || thisToken == '-')
				addSub();
			else if (thisToken == '*' || thisToken == '/' || thisToken == '%')
				divMul();
			else if (thisToken == '&' || thisToken == '|' || thisToken == '^')
				andOrXor();
			else if (thisToken == '?')
				ternaryToken();
			else if (thisToken == ':')
				return;
			else
				compare();
			return;
		} else if (thisToken == '(') {
			skipBracket();
			if (thisToken == ';')
				putError(lineCount, 18, '');
			//info("" + lineCount + " expected parenthesis");
			getToken();
		} else if (thisToken == '=' || thisToken == '+=' || thisToken == '-=' || thisToken == '*=' || thisToken == '/=') {
			assigment();
		} else if (thisToken == ';') {
			return;
		} else if (thisToken == '{') {
			skipBrace();
			getToken();
		} else if (thisToken == '}' || thisToken == ']' || thisToken == ')' || thisToken == ',') {
			return;
		} else if (thisToken == 'true') {
			asm.push(' LDC R' + registerCount + ',1');
		} else if (thisToken == 'false') {
			asm.push(' LDC R' + registerCount + ',0');
		} else if (thisToken == 'return') {
			returnToken();
		} else if (thisToken == 'if') {
			ifToken();
		} else if (thisToken == 'else') {
			return;
		} else if (thisToken == 'while') {
			whileToken();
		} else if (thisToken == 'for') {
			forToken();
		} else if (thisToken == 'switch') {
			switchToken();
		} else if (thisToken == 'case') {
			caseToken();
		} else if (thisToken == 'default') {
			defaultToken();
		} else if (thisToken == 'break') {
			breakToken();
		} else if (thisToken == 'unsigned') {
			putError(lineCount, 19, 'switch');
			//info("" + lineCount + " warning, unsigned not implemented " + thisToken);
			return;
		} else if (thisToken[0] == '"') {
			stringToken();
		} else {
			if (thisToken.length > 0)
				putError(lineCount, 20, thisToken);
			//info("" + lineCount + " unknown token " + thisToken);
		}
	}

	numberDebugString = [];
	console.time("compile");
	//register some standard functions
	registerFunction('random', 'int', ['int', 'i'], 1, 'RAND R%1', true, 0);
	registerFunction('sqrt', 'int', ['int', 'n'], 1, 'SQRT R%1', true, 0);
	registerFunction('putchar', 'char', ['char', 'c'], 1, 'PUTC R%1', true, 0);
	registerFunction('puts', 'int', ['*char', 'c'], 1, 'PUTS R%1', true, 0);
	registerFunction('putn', 'int', ['int', 'n'], 1, 'PUTN R%1', true, 0);
	registerFunction('gettimer', 'int', ['int', 'n'], 1, 'GTIMER R%1', true, 0);
	registerFunction('settimer', 'void', ['int', 'n', 'int', 'time'], 1, 'STIMER R%2,R%1', true, 0);
	registerFunction('clearscreen', 'int', [], 1, 'CLS', true, 0);
	registerFunction('setcolor', 'void', ['int', 'c'], 1, 'SFCLR R%1', true, 0);
	registerFunction('setbgcolor', 'void', ['int', 'c'], 1, 'SBCLR R%1', true, 0);
	registerFunction('setpallette', 'void', ['int', 'n', 'int', 'c'], 1, 'SPALET R%2,R%1', true, 0);
	registerFunction('getchar', 'int', [], 1, 'GETK R%0', true, 0);
	registerFunction('getkey', 'int', [], 1, 'GETJ R%0', true, 0);
	registerFunction('putpixel', 'void', ['int', 'x', 'int', 'y'], 1, 'PPIX R%2,R%1', true, 0);
	registerFunction('getpixel', 'int', ['int', 'x', 'int', 'y'], 1, 'GETPIX R%2,R%1', true, 0);
	registerFunction('getsprite', 'void', ['int', 'n', 'int', 'a'], 1, 'LDSPRT R%2,R%1', true, 0);
	registerFunction('putsprite', 'void', ['int', 'n', 'int', 'x', 'int', 'y'], 1, 'DRSPRT R%3,R%2,R%1', true, 0);
	registerFunction('getspriteinxy', 'int', ['int', 'x', 'int', 'y'], 1, 'GSPRXY R%2,R%1', true, 0);
	registerFunction('gettileinxy', 'int', ['int', 'x', 'int', 'y'], 1, 'GTILEXY R%2,R%1', true, 0);
	registerFunction('angbetweenspr', 'int', ['int', 'n1', 'int', 'n2'], 1, 'AGBSPR R%2,R%1', true, 0);
	registerFunction('spritespeedx', 'void', ['int', 'n', 'int', 's'], 1, 'LDC R15,2 \n SSPRTV R%2,R15,R%1', true, 0);
	registerFunction('spritespeedy', 'void', ['int', 'n', 'int', 's'], 1, 'LDC R15,3 \n SSPRTV R%2,R15,R%1', true, 0);
	registerFunction('spritegetvalue', 'int', ['int', 'n', 'int', 'type'], 1, 'SPRGET R%2,R%1', true, 0);
	registerFunction('spritesetvalue', 'void', ['int', 'n', 'int', 'type', 'int', 'value'], 1, 'SSPRTV R%3,R%2,R%1', true, 0);
	registerFunction('setimagesize', 'void', ['int', 's'], 1, 'ISIZE R%1', true, 0);
	registerFunction('setledcolor', 'void', ['int', 'c'], 1, 'SETLED R%1', true, 0);
	registerFunction('tone', 'void', ['int', 'freq', 'int', 'time'], 1, 'PLAYTN R%2,R%1', true, 0);
	registerFunction('loadrtttl', 'void', ['int', 'adr', 'int', 'loop'], 1, 'LOADRT R%2,R%1', true, 0);
	registerFunction('playrtttl', 'int', [], 1, 'PLAYRT', true, 0);
	registerFunction('pausertttl', 'int', [], 1, 'PAUSERT', true, 0);
	registerFunction('stoprtttl', 'int', [], 1, 'STOPRT', true, 0);
	registerFunction('savedata', 'int', ['int', 'name', 'int', 'array', 'int', 'count'], 1, 'NDATA R%3 \n SDATA R%2,R%1 \n MOV R%3,R%2', true, 0);
	registerFunction('loaddata', 'int', ['int', 'name', 'int', 'array'], 1, 'NDATA R%2 \n LDATA R%1 \n MOV R%2,R%1', true, 0);
	registerFunction('drawtile', 'void', ['int', 'x', 'int', 'y'], 1, 'DRTILE R%2,R%1', true, 0);
	registerFunction('scroll', 'void', ['char', 'direction'], 1, 'SCROLL R%1,R%1', true, 0);
	registerFunction('gotoxy', 'void', ['int', 'x', 'int', 'y'], 1, 'SETX R%2 \n SETY R%1', true, 0);
	registerFunction('line', 'void', ['int', 'x', 'int', 'y', 'int', 'x1', 'int', 'y1'], 1, '_line: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n DLINE R1 \n RET \n', false, 0);
	registerFunction('spritespeed', 'void', ['int', 'n', 'int', 'speed', 'int', 'dir'], 1, '_spritespeed: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n SPRSDS R1 \n RET \n', false, 0);
	registerFunction('delayredraw', 'void', [], 1, '_delayredraw: \n LDF R1,6\n CMP R1,0\n JZ _delayredraw \n RET \n', false, 0);
	registerFunction('distance', 'int', ['int', 'x1', 'int', 'y1', 'int', 'x2', 'int', 'y2'], 1, '_distance: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n DISTPP R1 \n RET \n', false, 0);
	dataAsm = [];
	dataAsm.push('_putimage: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n DRWIM R1 \n RET');
	dataAsm.push(' ');
	registerFunction('putimage', 'void', ['int', 'a', 'int', 'x', 'int', 'y', 'int', 'w', 'int', 'h'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_putimage1bit: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n DRWBIT R1 \n RET');
	dataAsm.push(' ');
	registerFunction('putimage1bit', 'void', ['int', 'a', 'int', 'x', 'int', 'y', 'int', 'w', 'int', 'h'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_putimagerle: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n DRWRLE R1 \n RET');
	dataAsm.push(' ');
	registerFunction('putimagerle', 'void', ['int', 'a', 'int', 'x', 'int', 'y', 'int', 'w', 'int', 'h'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_setparticle: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n SPART R1 \n RET');
	dataAsm.push(' ');
	registerFunction('setparticle', 'void', ['int', 'gravity', 'int', 'count', 'int', 'time'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_setemitter: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n SEMIT R1 \n RET');
	dataAsm.push(' ');
	registerFunction('setemitter', 'void', ['int', 'time', 'int', 'dir', 'int', 'dir1', 'int', 'speed'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_drawparticle: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n DPART R1 \n RET');
	dataAsm.push(' ');
	registerFunction('drawparticle', 'void', ['int', 'x', 'int', 'y', 'char', 'color'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_loadtile: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n LDTILE R1 \n RET');
	dataAsm.push(' ');
	registerFunction('loadtile', 'void', ['int', 'a', 'int', 'imgwidth', 'int', 'imgheight', 'int', 'width', 'int', 'height'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_printf: \n MOV R2,R0 \n ADD R2,R1 \n LDI R2,(R2) \n LDC R3,(R2) \nnext_printf_c:')
	dataAsm.push(' CMP R3,37 ;% \n JZ printf_get\n PUTC R3\n INC R2 \n LDC R3,(R2) \n JNZ next_printf_c');
	dataAsm.push(' RET \nnext_printf_c_end:\n INC R2 \n LDC R3,(R2)\n JNZ next_printf_c \n RET\nprintf_get:');
	dataAsm.push(' INC R2 \n LDC R3,(R2) \n CMP R3,37 ;%\n JZ printf_percent\n DEC R1,2 \n LDI R4,(R1+R0)');
	dataAsm.push(' CMP R3,100 ;d\n JZ printf_d \n CMP R3,105 ;i\n JZ printf_d \n CMP R3,115 ;s\n JZ printf_s \n CMP R3,99 ;c\n JZ printf_c');
	dataAsm.push(' JMP next_printf_c \nprintf_percent:\n PUTC R3 \n JMP next_printf_c_end \nprintf_d: \n PUTN R4');
	dataAsm.push(' JMP next_printf_c_end\nprintf_c: \n PUTC R4\n JMP next_printf_c_end\nprintf_s:\n PUTS R4 \n JMP next_printf_c_end');
	registerFunction('printf', 'int', ['*char', 's', '...'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_free:\n LDI R1,(2 + R0)\n DEC R1,2\n LDI R3,32768\n LDI R2,(R1)\n SUB R2,R3\n LDI R4,(R1+R2)\n CMP R4,0\n JZ end_free_0');
	dataAsm.push(' CMP R3,R4\n JP next_free\n STI (R1),R2\n RET \nend_free_0:\n LDI R2,0\n STI (R1),R2\n RET\nnext_free:\n ADD R2,R4');
	dataAsm.push(' LDI R4,(R1+R2)\n CMP R4,0\n JZ end_free_0\n CMP R3,R4\n JP next_free\n STI (R1),R2 \n RET');
	dataAsm.push(' ');
	registerFunction('free', 'void', ['int', 'a'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('\n_malloc: \n LDI R2,(2 + R0)\n CMP R2,0 \n JZ end_malloc \n  MOV R5,R2\n LDC R4,1\n AND R5,R4\n CMP R5,1\n JNZ next_malloc');
	dataAsm.push(' INC R2\nnext_malloc:\n INC R2,2\n LDI R1,#END \n LDI R4,32768 ;0x8000\nnext_byte:\n LDI R3,(R1)\n CMP R3,R4');
	dataAsm.push(' JNP malloc1 \n SUB R3,R4\n ADD R1,R3 \n CMP R1,R0 \n JP end_malloc\n JMP next_byte\nmalloc1:\n CMP R3,0 \n JNZ malloc2');
	dataAsm.push(' MOV R5,R2\n ADD R5,R1\n CMP R5,R0 \n JP end_malloc\n ADD R2,R4\n STI (R1),R2\n INC R1,2\n RET\nmalloc2: \n MOV R6,R3');
	dataAsm.push(' SUB R6,R2\n JNP next_byte1 \n MOV R5,R2\n ADD R5,R1\n CMP R5,R0\n JP end_malloc\n ADD R2,R4\n STI (R1),R2\n INC R1,2');
	dataAsm.push(' CMP R6,0 \n JZ ret_malloc\n STI (R5),R6\n RET\n next_byte1: \n ADD R1,R3 \n JMP next_byte \nend_malloc:\n LDC R1,0\n RET');
	dataAsm.push(' ');
	dataAsm.push('ret_malloc:\n RET');
	dataAsm.push(' ');
	registerFunction('malloc', 'int', ['int', 'l'], 1, dataAsm, false, 0);
	dataAsm = [];
	//main compilation cycle, executed while there are tokens in the input
	while (getToken()) {
		execut();
	}
	//specify the place for the heap, if necessary
	if (isFunction('malloc'))
		asm.push(' LDI R15,0 \n STI (#END),R15');
	//at the end of the program, call main if there is one
	if (isFunction('main')) {
		for (var i = 0; i < functionTable.length; i++) {
			if (functionTable[i].name == 'main') {
				if (functionTable[i].varLength > 0) {
					if (functionTable[i].varLength < 15)
						asm.push(' DEC R0,' + functionTable[i].varLength);
					else
						asm.push(' LDC R15,' + functionTable[i].varLength + '\n SUB R0,R15');
				}
				break;
			}
		}
		asm.push(' CALL _main');
	}
	//if not, then the program will work anyway
	else
		putError(lineCount, 21, '');
	//info ("the entry point to the main function was not found");
	//when returning from main, we stop the program
	asm.push('HLT');
	asm.push(' ');
	//check if the functions were called at least once and add the code of only those called
	for (var i = 0; i < functionTable.length; i++) {
		if (functionTable[i].use > 0)
			asm = asm.concat(functionTable[i].asm);
	}
	//combine the code with the data
	asm = asm.concat(dataAsm);
	console.timeEnd("compile");

	return asm;
}
