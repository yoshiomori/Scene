var teste = 1;

function main(){
	var canvas = document.getElementById('window');
	var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	if(!gl){
		throw new Error("Não foi possível inicializar o WebGL");
	}
	var scene = new Scene(gl);
	scene.createShaders('shader', "#shader-vs", "#shader-fs", ["aVertexPosition", "aVertexColor"], ["uPMatrix","uVMatrix","uMMatrix"]);
	scene.createCamera('camera', 'perspective');
	scene.createImage('cubo','untitled.obj','shader');
	scene.createPiece('cubo', 'cubo');
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
//	console.log(scene);
	animation();
	function animation() {
//		console.log(gl);C
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		if(scene.isReady()){
			scene.cameras['camera'].show();
//			console.log(scene);
		}
//		if(scene.images.hasOwnProperty('cubo') && teste){
////			console.log(scene.isReady());
////			console.log(scene.pieces.cubo.isReady());
////			scene.cameras.camera.show();
//			teste = 0;
//		}
		resizeCanvas(canvas);
		requestAnimationFrame(animation);
	};
	function resizeCanvas() {
		var width = canvas.clientWidth;
		var height = canvas.clientHeight;
		if (canvas.width != width || canvas.height != height) {
			canvas.width = width;
			canvas.height = height;
		}
	}
}