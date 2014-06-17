function main(){
	var canvas = document.getElementById('window');
	var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	if(!gl){
		throw new Error("Não foi possível inicializar o WebGL");
	}
	var scene = new Scene(gl);
	scene.createShaders('shader', "#shader-vs", "#shader-fs", ["aVertexPosition", "aVertexColor"], ["uPMatrix","uVMatrix","uMMatrix"]);
	scene.createCamera('camera', 'perspective');
	scene.createImage('cuboImagem1','untitled.obj','shader');
	scene.createImage('cuboImagem2','untitled2.obj','shader');
	scene.createPiece('cubo', 'cuboImagem1');
	scene.pieces.cubo.setSize([1,1,1]);
	scene.pieces.cubo.setPosition([0,0,-10]);
	scene.pieces.cubo.rotate([1,0,1],Math.PI/4);
	scene.createPiece('cubo2', 'cuboImagem2');
	scene.pieces.cubo2.setSize([1,1,1]);
	scene.pieces.cubo2.setPosition([2,2,-10]);
	scene.pieces.cubo2.rotate([0,1,1],Math.PI/6);
	
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	animation();
	function animation() {
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		if(scene.isReady()){
			scene.cameras['camera'].show();
		}
		resizeCanvas(canvas);
		requestAnimationFrame(animation);
	};
	function resizeCanvas() {
		var width = canvas.clientWidth;
		var height = canvas.clientHeight;
		if (canvas.width != width || canvas.height != height) {
			canvas.width = width;
			canvas.height = height;
			for(camera in scene.cameras){
				scene.cameras[camera].forceUpdate();
			}
		}
	}
}