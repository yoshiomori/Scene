var gl;
var shaderProgram;
var teclasPressionadas = {};
var f_esq_pos;
var f_esq_cor;
var f_dir_pos;
var f_dir_cor;
var mMatrix = mat4.create();
var pMatrix = mat4.create();
var vMatrix = mat4.create();

var ANGLE_STEP = 270;
var ANGLE_FLIP_ESQ = -105;
var ANGLE_LIM_FLIP_ESQ = -30;
var ang_esq = ANGLE_FLIP_ESQ;
var ang_dir = -ANGLE_FLIP_ESQ;
var ultimo = 0;

var mola = false;         
var start = false;
var restart = false;
var pause = false;
var flip_dir = false;
var flip_esq = false;
// Variável que armazena o ângulo da mesa. Inicialmente a inclinação da mesa é de 30 graus.
var ang_mesa = 30; 


function main(){
	iniciaWebGL();
}

function iniciaWebGL(){
	var canvas = document.getElementById("window");
	iniciarGL(canvas); // Definir como um canvas 3D
    iniciarShaders();  // Obter e processar os Shaders
    iniciarBuffers();  // Enviar o triângulo e quadrado na GPU
    iniciarAmbiente(); // Definir background e cor do objeto
   
    document.onkeydown = eventoTeclaPress;
    document.onkeyup = eventoTeclaSolta; 
    desenharCena();
    tick();
}

function iniciarGL(canvas){
	try{
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
     }
     
	catch(e){
		if(!gl) alert("Não pode inicializar WebGL, desculpe");
    }
}

function iniciarShaders(){
	var vertexShader = getShader(gl, "#shader-vs");
	var fragmentShader = getShader(gl, "#shader-fs");
	
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);
	
	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) alert("Não pode inicializar shaders");
	
	gl.useProgram(shaderProgram);
	
	shaderProgram.vertexPositionAttribute = gl.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
	
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.vMatrixUniform = gl.getUniformLocation(shaderProgram, "uVMatrix");
	shaderProgram.mMatrixUniform = gl.getUniformLocation(shaderProgram, "uMMatrix");
}
      
function getShader(gl, id){
	var shaderScript = $(id)[0];
	if(!shaderScript)	return null;
	var str = "";
	var k = shaderScript.firstChild;
	while(k){
		if(k.nodeType == 3)
	    str += k.textContent;
		k = k.nextSibling;
	}

	var shader;
	if(shaderScript.type == "x-shader/x-fragment")
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	
	else if(shaderScript.type == "x-shader/x-vertex")
		shader = gl.createShader(gl.VERTEX_SHADER);
	else
	  return null;
	
	gl.shaderSource(shader, str);
	gl.compileShader(shader);
	
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
	{
	  alert(gl.getShaderInfoLog(shader));
	  return null;
	}

	return shader;
}

function iniciarBuffers(){
	// posiçoes --------------------------------------------------------------------------------	
	f_esq_pos = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, f_esq_pos);
	var vertices = [
	                0.0, 0.5, 0.0,
	                -0.5,-0.5, 0.0,
	                0.5,-0.5, 0.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	f_esq_pos.itemSize = 3;
	f_esq_pos.numItems = 3;
	
	f_dir_pos = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, f_dir_pos);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	f_dir_pos.itemSize = 3;
	f_dir_pos.numItems = 3;
	
// cores --------------------------------------------------------------------------------	
	f_esq_cor = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, f_esq_cor);
	var cores = [
	             1.0, 0.0, 0.0, 1.0,
	             0.0, 1.0, 0.0, 1.0,
	             0.0, 1.0, 0.0, 1.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cores), gl.STATIC_DRAW);
	f_esq_cor.itemSize = 4;
	f_esq_cor.numItems = 3;
	
	f_dir_cor = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, f_dir_cor);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cores), gl.STATIC_DRAW);
	f_dir_cor.itemSize = 4;
	f_dir_cor.numItems = 3;
}

function iniciarAmbiente(){
	  gl.clearColor(0.0, 0.0, 0.0, 1.0);
	  gl.enable(gl.DEPTH_TEST);
}

function desenharCena(){
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
	mat4.identity(mMatrix);
	mat4.identity(vMatrix);
	
	mat4.translate(mMatrix, [-1.5, 0.0, -7.0]);
	mat4.rotate(mMatrix, degToRad(ang_esq), [0, 0, 1]);
	gl.bindBuffer(gl.ARRAY_BUFFER, f_esq_pos);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, f_esq_pos.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, f_esq_cor);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, f_esq_cor.itemSize, gl.FLOAT, false, 0, 0);
	
	setMatrixUniforms();
	gl.drawArrays(gl.TRIANGLES, 0, f_esq_pos.numItems); 
	
	mat4.identity(mMatrix);
	mat4.translate(mMatrix, [1.5, 0.0, -7.0]);
	mat4.rotate(mMatrix, degToRad(ang_dir), [0, 0, 1]);
	gl.bindBuffer(gl.ARRAY_BUFFER, f_dir_pos);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, f_dir_pos.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, f_dir_cor);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, f_dir_cor.itemSize, gl.FLOAT, false, 0, 0);
	
	setMatrixUniforms();
	gl.drawArrays(gl.TRIANGLES, 0, f_dir_pos.numItems);
}

function setMatrixUniforms(){
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.vMatrixUniform, false, vMatrix);
	gl.uniformMatrix4fv(shaderProgram.mMatrixUniform, false, mMatrix);
}

function animar(){
	var agora = Date.now();
	var diferenca = agora - ultimo;
	if(!pause && start){
		if(flip_esq){
			if(ang_esq < ANGLE_LIM_FLIP_ESQ)
				ang_esq += (ANGLE_STEP * diferenca) / 1000.0;
			else
				flip_esq = false;
		}
		else{
			if(ang_esq > ANGLE_FLIP_ESQ) 
				ang_esq -= (ANGLE_STEP * diferenca) / 1000.0;
			else{
				ang_esq = ANGLE_FLIP_ESQ;
			}
		}
	
		if(flip_dir){
			if(ang_dir > -ANGLE_LIM_FLIP_ESQ)
				ang_dir -= (ANGLE_STEP * diferenca) / 1000.0;
			else
				flip_dir = false;
		}
		else{
			if(ang_dir < -ANGLE_FLIP_ESQ) 
				ang_dir += (ANGLE_STEP * diferenca) / 1000.0;
			else{
				ang_dir = -ANGLE_FLIP_ESQ;
			}
		}
	}
	ultimo = agora;
}


function tick(){
	tratarTeclado();
	if(restart){
		ang_esq = ANGLE_FLIP_ESQ;
		ang_dir = -ANGLE_FLIP_ESQ;
		ultimo = 0;
		mola = false;         
		start = false;
		restart = false;
		pause = false;
		flip_dir = false;
		flip_esq = false;
		ang_mesa = 30; 
		desenharCena();
	}
	else{
		if(!pause && start){
			desenharCena();
		}
	}
	animar();
	requestAnimFrame(tick);
}

function eventoTeclaPress(evento) {
	teclasPressionadas[evento.keyCode] = true;
	if (String.fromCharCode(evento.keyCode) == "F")
		filtro = (filtro+1) % 3;
}

function eventoTeclaSolta(evento) {
	teclasPressionadas[evento.keyCode] = false;
}

function tratarTeclado() {
	if (teclasPressionadas[80]) {
		// Letra p = pause
		pause = true;
	}
	if (teclasPressionadas[85]) {
		// Letra u = unpause
		pause = false;
	}
	if (teclasPressionadas[13]) {
		// Enter
		start = true;
	}	
	// Só tratará essas teclas se o jogo não estiver pausado
	if(!pause && start){
		if (teclasPressionadas[32]) {
			// Space
			mola = true;
		}
		if (teclasPressionadas[33]) {
			// Page Up
			if(ang_mesa <= 90)
				ang_mesa += 10;
		}
		if (teclasPressionadas[34]) {
			// Page Down
			if(ang_mesa >= 0)
				ang_mesa -= 10;
		}
		if (teclasPressionadas[90]) {
			// Letra z = flipper esq
			flip_esq = true;
		}
		if (teclasPressionadas[88]) {
			// Letra x = flipper dir
			flip_dir = true;
		}
		if (teclasPressionadas[82]) {
			// Letra r = restart
			restart = true;
		}
	}
}

function degToRad(graus){
	return graus * Math.PI / 180;
}

