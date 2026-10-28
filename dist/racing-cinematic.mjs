export function createOvertakeCinematic(stage){
 stage.dataset.overtakeCinematic='disabled';stage.dataset.teslaFire='off';
 return {
  reset(){stage.dataset.overtakeCinematic='disabled';},
  update(){return false;},
  draw(){},
  dispose(){}
 };
}
