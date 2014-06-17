function Scene(gl){
	this.gl = gl;
	this.gl.shaders = new Object();
	this.images = new Object();
	this.pieces = new Object();
	this.cameras = new Object();
	this.requests = new Array();
	this.ready = false;
};

Scene.prototype.createShaders = function(name, vs, fs, namesOfAttributes, namesOfUniforms){
	if(namesOfUniforms.length != 3) throw new Error("Deve haver 3 uniformes");
	var gl = this.gl;
	var vertexShader = getShader(gl, vs);
	var fragmentShader = getShader(gl, fs);
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
		alert("Não pode inicializar shaders");
	}
	gl.useProgram(program);
	var attributes = new Object;
	namesOfAttributes.forEach(function(name){
		attributes[name] = gl.getAttribLocation(program, name);
	});
	var uniforms = new Object;
	namesOfUniforms.forEach(function(name){
		uniforms[name] = gl.getUniformLocation(program, name);
	});
	program.attributes = attributes;
	program.uniforms = uniforms;
	gl.shaders[name] = program;

	function getShader(gl, id)
	{
		var shaderScript = $(id)[0];
		if(!shaderScript){
			return null;
		}
		var str = "";
		var k = shaderScript.firstChild;
		while(k){
			if(k.nodeType == 3)
				str += k.textContent;
			k = k.nextSibling;
		}
		var shader;
		if(shaderScript.type == "x-shader/x-fragment"){
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		}
		else if(shaderScript.type == "x-shader/x-vertex"){
			shader = gl.createShader(gl.VERTEX_SHADER);
		}
		else{
			return null;
		}
		gl.shaderSource(shader, str);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			alert(gl.getShaderInfoLog(shader));
			return null;
		}
		return shader;
	}
};

Scene.prototype.createImage = function(imageName,fileName,shaderName){
	var scene = this;

	var client = new XMLHttpRequest();
	client.open('GET', fileName);
	client.onreadystatechange = function(){
		if (client.readyState === 4 && client.status === 200) {
			var file = client.responseText;
			var currentMaterialName = "";
			var v = new Array;
			var vt = new Array;
			var vn = new Array;
			var bufferAux = new Array();
			var indexAux = new Array();
			var C = new Array;
			var c = new Array;
			file.split(/\n+/).forEach(function(line){
				var words = line.split(/\s+/);
				words = words.filter(function(item){return (item!="");});
				switch (words.shift()){
				case 'mtllib':
					currentMaterialName = words.shift();
					break;
				case 'v':
					v.push(words);
					break;
				case 'vt':
					vt.push(words);
					break;
				case 'vn':
					vn.push(words);
					break;
				case 'f':
					words.forEach(function(word){
						if(C.indexOf(word) == -1) c.push(word);
						C.push(word);
					});
					break;
				}
			});
			C.forEach(function(value){indexAux.push(c.indexOf(value));});
			c.forEach(function(value){
				var chars = value.split('/');
				chars.forEach(function(char,indexAux){
					switch(indexAux){
					case 0:
						bufferAux = bufferAux.concat(v[char - 1]);
						break;
					case 1:
						if(vt.length)bufferAux = bufferAux.concat(vt[char - 1]);
						break;
					case 2:
						if(vn.length)bufferAux = bufferAux.concat(vn[char - 1]);
						break;
					}
				});
			});
			var buffer = new Float32Array(bufferAux);
			var index = new Uint8Array(indexAux);
			var sizes = new Array;
			sizes = [v[0].length];
			if(vt.length) sizes.push(vt[0].length);
			if(vn.length) sizes.push(vn[0].length);
			var image =  new Buffer(buffer,index,sizes, scene.gl, shaderName);
//			console.log(image);
			if(currentMaterialName){
				var client2 = new XMLHttpRequest();
				client2.open('GET', currentMaterialName);
				client2.onreadystatechange = function(){
					if (client2.readyState === 4 && client2.status === 200) {
						file = client2.responseText;
						file.split(/\n+/).forEach(function(line){
							var words = line.split(/\s+/);
							switch (words.shift()){
							case 'Ns':
								image.Ns = words.pop();
								break;
							case 'Ka':
								image.Ka = words;
								break;
							case 'Kd':
								image.Kd = words;
								break;
							case 'Ks':
								image.Ks = words;
								break;
							case 'Ni':
								image.Ni = words.pop();
								break;
							case 'd':
								image.d = words.pop();
								break;
							}
						});
						scene.images[imageName] = image;
					}
				};
				client2.send();
			}
			else images[imageName] = image;
		}
	};
	client.send();

	function Buffer(buffer, index, sizes, gl, shaderName){
		var stride = 0;
		sizes.forEach(function(size){stride += size;});
		stride *= 4;
		this.vertices = newBuffer(gl.ARRAY_BUFFER, buffer);
		var offset = 0;
		var offsets = sizes.map(function(item, index, array){
			var mem = offset;
			offset += item;
			return mem * 4;
		});
		for(attribute in gl.shaders[shaderName].attributes){
			gl.vertexAttribPointer(gl.shaders[shaderName].attributes[attribute], sizes.shift(), gl.FLOAT, false, stride, offsets.shift());
			gl.enableVertexAttribArray(gl.shaders[shaderName].attributes[attribute]);
		}
		this.indices = newBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
		this.length = index.length;
		function newBuffer(type, data){
			var buffer = gl.createBuffer();
			gl.bindBuffer(type, buffer);
			gl.bufferData(type, data, gl.STATIC_DRAW);
			return buffer;
		};
		this.draw = function(pMatrix,vMatrix,mMatrix){
//			console.log(PMatrix);
//			console.log(VMatrix);
//			console.log(MMatrix);
//			arguments.length
//			console.log(arguments);
//			arguments.forEach(function(item){
//				gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms.uPMatrix, false, pMatrix);
//			});
//			console.log(gl);
//			for(uniform in gl.shaders[shaderName].uniforms){
////				console.log(uniform);
////				console.log(gl.shaders[shaderName].uniforms[uniform]);
//				console.log(arguments.shift());
////				gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms[uniform], false, arguments.shift());
//			}
			gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms.uPMatrix, false, pMatrix);
			gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms.uVMatrix, false, vMatrix);
			gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms.uMMatrix, false, mMatrix);
//			console.log(this);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
			gl.drawElements(gl.TRIANGLES, this.length, gl.UNSIGNED_BYTE, 0);
		};
	}
};

Scene.prototype.createPiece = function(name, imageName){
	this.pieces[name] = new Piece(imageName,this);
	function Piece(imageName,scene){
		if(!((typeof imageName == 'string') && imageName)) throw new Error('Erro no nome da imagem');
		var image = null;
		var position = new Float32Array(3);
		var scale = new Float32Array([1,1,1]);
		var axis = new Float32Array(3);
		var angle = 0;
		var ready = false;
		var mMatrix = mat4.create();
		update();
//		this.getMatrix= function(cameraName){
//			if(!image) throw new Error("Nome da imagem não definida");
////			scene.cameras[cameraName].update();
////			scene.gl.uniformMatrix4fv(prg.uMMatrix, false, mMatrix);
//			image(mMatrix);
//		};
		this.setPosition = function(array){
			if(position != array){
				position = array;
				update();
			}
		};
		this.setSize = function(array){
			if(scale != array){
				scale = array;
				update();
			}
		};
		this.rotate = function(array, theta){
			if(axis != array || angle != theta)
			axis = array;
			angle = theta;
			update();
		};
		this.isReady = function(){
			if(!ready && scene.images.hasOwnProperty(imageName)){
				ready = true;
				image = scene.images[imageName];
//				console.log(image.draw());
			}
			return ready;
		};
		function update(){
			mat4.identity(mMatrix);
			mat4.translate(mMatrix, position);
			mat4.scale(mMatrix, scale);
			mat4.rotate(mMatrix, angle, axis);
		}
		this.show = function(PMatrix,VMatrix){
			if(!image) throw new Error("Nome da imagem não definida");
			image.draw(PMatrix,VMatrix,mMatrix);
//			console.log(image);
		};
	};
};

Scene.prototype.createCamera = function(cameraName, Projection){
	this.cameras[cameraName] = new Camera(this);
	function Camera(scene){
		var projection = new String;
		var position = new Float32Array(3);
		var lookAt = new Float32Array(3);
		var up = new Float32Array(3);
		var VMatrix = mat4.create();
		var PMatrix = mat4.create();
		update();
		
		function update(){
			mat4.identity(VMatrix);
			VMatrix = mat4.lookAt(position, lookAt, up);
			updateProjection(Projection);
		}
		
		this.setPosition = function(array){
			if(position != array){
				position = array;
				update();
			}
		};
		this.setLookAt = function(array){
			if(lookAt != array){
				lookAt = array;
				update();
			}
		};
		this.setUp = function(array){
			if(up != array){
				up = array;
				update();
			}
		};
		this.setProjection = function(Projection){
			updateProjection(Projection);
		};
		function updateProjection(Projection){
			if(Projection != projection){
				var gl = scene.gl;
				mat4.identity(PMatrix);
				switch(Projection){
				case 'perspective':
					var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
					mat4.perspective(45, aspect, 0.1, 100.0, PMatrix);
					projection = Projection;
					break;
				case 'ortho':
					mat4.ortho(0, gl.canvas.clientWidth, 0, gl.canvas.clientHeight, 0.1, 100.0, PMatrix);
					projection = Projection;
					break;
				default:
					throw new Error('Tipo de projeção inválida!');
				}
			}
		};
		this.show = function(){
			var pieces = scene.pieces;
			for(piece in pieces){
				pieces[piece].show(PMatrix,VMatrix);
			}
		};
	}
//	var scene = this;
//	var camera = new Object;
//	var projection = new String;
//	var position = new Float32Array(3);
//	var lookAt = new Float32Array(3);
//	var up = new Float32Array(3);
//	var VMatrix = mat4.create();
//	var PMatrix = mat4.create();
//	update();
//	
//	function update(){
//		mat4.identity(VMatrix);
//		VMatrix = mat4.lookAt(position, lookAt, up);
//		updateProjection(Projection);
//	}
//	
//	camera.setPosition = function(array){
//		if(position != array){
//			position = array;
//			update();
//		}
//	};
//	camera.setLookAt = function(array){
//		if(lookAt != array){
//			lookAt = array;
//			update();
//		}
//	};
//	camera.setUp = function(array){
//		if(up != array){
//			up = array;
//			update();
//		}
//	};
//	camera.setProjection = function(Projection){
//		updateProjection(Projection);
//	};
//	function updateProjection(Projection){
//		if(Projection != projection){
//			var gl = scene.gl;
//			mat4.identity(PMatrix);
//			switch(Projection){
//			case 'perspective':
//				var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
//				mat4.perspective(45, aspect, 0.1, 100.0, PMatrix);
//				projection = Projection;
//				break;
//			case 'ortho':
//				mat4.ortho(0, gl.canvas.clientWidth, 0, gl.canvas.clientHeight, 0.1, 100.0, PMatrix);
//				projection = Projection;
//				break;
//			default:
//				throw new Error('Tipo de projeção inválida!');
//			}
//		}
//	};
//	camera.show = function(){
//		var pieces = scene.pieces;
//		for(piece in pieces){
//			pieces[piece].show(PMatrix,VMatrix);
//		}
//	};
//	this.cameras[cameraName] = camera;
};

Scene.prototype.isReady = function(){
	if(!this.ready){
		this.ready = true;
		pieces = this.pieces;
		for(piece in pieces){
//			console.log(piece);
//			console.log(this.ready);
//			console.log(pieces[piece].isReady());
//			console.log(pieces[piece].isReady() && this.ready);
			if(!pieces[piece].isReady())this.ready = false;
		}
	}
	return this.ready;
};