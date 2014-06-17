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
//	if(namesOfUniforms.length != 3) throw new Error("Deve haver 3 uniformes");
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

Scene.prototype.createImage = function(imageName,fileName,shaderName, stride, offsets){
	var scene = this;
	console.log(stride);
	console.log(offsets);

	var client = new XMLHttpRequest();
	client.open('GET', fileName, false);
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
			var lengths = new Array;
			lengths = [v[0].length];
			if(vt.length) lengths.push(vt[0].length);
			if(vn.length) lengths.push(vn[0].length);
			var image =  new Buffer(buffer,index,lengths, scene.gl, shaderName, stride, offsets);
//			var image =  new Buffer(buffer,index, scene.gl, shaderName);
			if(currentMaterialName){
				var client2 = new XMLHttpRequest();
				client2.open('GET', currentMaterialName, false);
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

	function Buffer(buffer, index, lengths, gl, shaderName, stride, offsets){
		var bytes = 4;
//		var stride = 0;
//		sizes.forEach(function(size){stride += size;});
		stride *= bytes;
		this.vertices = newBuffer(gl.ARRAY_BUFFER, buffer);
//		var offset = 0;
//		var offsets = sizes.map(function(item, index, array){
//			var mem = offset;
//			offset += item;
//			return mem * 4;
//		});
		offsets = offsets.map(function(item){return item * bytes;});
		this.indices = newBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
		this.indexLength = index.length;
		function newBuffer(type, data){
			var buffer = gl.createBuffer();
			gl.bindBuffer(type, buffer);
			gl.bufferData(type, data, gl.STATIC_DRAW);
			return buffer;
		};
		this.draw = function(pMatrix,vMatrix,mMatrix){
			var i = 0;
			for(uniform in gl.shaders[shaderName].uniforms){
				gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms[uniform], false, arguments[i]);
				gl.enableVertexAttribArray(gl.shaders[shaderName].uniforms[uniform]);
				i++;
			}
//			gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms.uPMatrix, false, pMatrix);
//			gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms.uVMatrix, false, vMatrix);
//			gl.uniformMatrix4fv(gl.shaders[shaderName].uniforms.uMMatrix, false, mMatrix);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
			var i = 0;
			for(attribute in gl.shaders[shaderName].attributes){
				gl.vertexAttribPointer(gl.shaders[shaderName].attributes[attribute], lengths[i], gl.FLOAT, false, stride, offsets[i]);
				gl.enableVertexAttribArray(gl.shaders[shaderName].attributes[attribute]);
				i++;
			}
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
			gl.drawElements(gl.TRIANGLES, this.indexLength, gl.UNSIGNED_BYTE, 0);
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

		this.forceUpdate = function(){
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
		};
		
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


};

Scene.prototype.isReady = function(){
	if(!this.ready){
		this.ready = true;
		pieces = this.pieces;
		for(piece in pieces){
			if(!pieces[piece].isReady())this.ready = false;
		}
	}
	return this.ready;
};