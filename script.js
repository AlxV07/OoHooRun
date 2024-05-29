import  * as THREE from './ThreeRes/three.module.js'
import { PointerLockControls } from './ThreeRes/PointerLockControls.js';
import {BoxGeometry, Mesh, MeshBasicMaterial} from "./ThreeRes/three.module.js";

// ======= Setup =======
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121212);
const camera = new THREE.PerspectiveCamera(80, window.innerWidth/window.innerHeight, 0.1, 25);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new PointerLockControls(camera, document.body);
function lockControls() {controls.lock();}
scene.add(controls.getObject());
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
camera.position.y = 1.5
camera.position.z = 5;
camera.position.z = 5;
camera.rotation.y = Math.PI
// =======

// ======= Maze =======
// Floor Gen
const floorLength = 100
const floorWidth = 100
const floorY = 0
const floorGeo = new THREE.BoxGeometry(1, 1, 1);
const floorMat1 = new THREE.MeshBasicMaterial({color: 0x989898});
const floorMat2 = new THREE.MeshBasicMaterial({color: 0x878787});
function buildFloor() {
    for (let x = 0; x < floorLength; x++) {
        for (let z = 0; z < floorWidth; z++) {
            let floorPiece;
            if ((x + z) % 2 === 0) {
                floorPiece = new THREE.Mesh(floorGeo, floorMat1);
            } else {
                floorPiece = new THREE.Mesh(floorGeo, floorMat2);
            }
            floorPiece.position.set(x, floorY, z)
            scene.add(floorPiece);
        }
    }
}

// Roof Gen
const roofY = 4
const roofGeo = new THREE.BoxGeometry(1, 1, 1);
const roofMat = new THREE.MeshBasicMaterial({color: 0x878787});
function buildRoof() {
    for (let x = 0; x < floorLength; x++) {
        for (let z = 0; z < floorWidth; z++) {
            let roofPiece = new THREE.Mesh(roofGeo, roofMat);
            roofPiece.position.set(x, roofY, z)
            scene.add(roofPiece);
        }
    }
}

// Border Gen
function buildBorders() {
    const bxGeo = new BoxGeometry(floorLength + 1, 10, 1)
    const bMat = new THREE.MeshBasicMaterial({color: 0x343434, wireframe: false});
    const bx1 = new THREE.Mesh(bxGeo, bMat);
    bx1.position.set(floorLength / 2, floorY, -1)
    scene.add(bx1)
    const bx2 = new THREE.Mesh(bxGeo, bMat);
    bx2.position.set(floorLength / 2, floorY, floorWidth)
    scene.add(bx2)
    const byGeo = new BoxGeometry(1, 10, floorWidth + 1)
    const by1 = new THREE.Mesh(byGeo, bMat);
    by1.position.set(-1, floorY, floorWidth / 2)
    scene.add(by1)
    const by2 = new THREE.Mesh(byGeo, bMat);
    by2.position.set(floorLength, floorY, floorWidth / 2)
    scene.add(by2)
}

// Grid for wall markers and pathfinding; x=len,z=wid
const grid = []  // grid[width][length] = {isWall: bool, connectsTo:[[x, z],...]
function genGrid() {
    for (let z = 0; z < floorWidth; z++)  {
        grid.push([])
        for (let x = 0; x < floorLength; x++) {
            grid[z].push({isWall: false, connectsTo: []})  // connectsTo[i] = [x, z]
        }
    }
}

// Wall Gen
const minNofWalls = 250
const maxNofWalls = 750
const nofWallTypes = 4  // Remember to implement how each wall type should be built
const nofWalls = Math.round(minNofWalls + Math.random() * (maxNofWalls - minNofWalls))
const wallGeo = new THREE.BoxGeometry(1, 10, 1);
const c1Geo = new THREE.BoxGeometry(0.5, 10, 1);
const c2Geo = new THREE.BoxGeometry(1, 10, 0.5);
const wallMat = new THREE.MeshBasicMaterial({color: 0x565656, wireframe: false});
function makeWallBlock(x, z) {
    const wall = new THREE.Mesh(wallGeo, wallMat);
    const c1 = new THREE.Mesh(c1Geo, wallMat);
    const c2 = new THREE.Mesh(c2Geo, wallMat);
    wall.position.set(x, floorY, z)
    c1.position.set(x, floorY, z)
    c2.position.set(x, floorY, z)
    scene.add(wall)
    scene.add(c1)
    scene.add(c2)
    try {
        grid[z][x].isWall = true
    } catch (e) {
        console.error('coord of conflict:', z, x)
        console.error('grid:', grid)
    }
}
function buildWalls() {
    for (let i = 0; i < nofWalls; i++) {
        const wallType = Math.round(Math.random() * (nofWallTypes - 1)) + 1
        const x = Math.round(Math.random() * floorLength)
        const z = Math.round((Math.random() * floorWidth))
        switch (wallType) {
            case 1: {  // 1x1
                if (x < floorLength && z < floorWidth) {
                    makeWallBlock(x, z)
                }
                break
            }
            case 2: {  // 1x3
                for (let j = 0; j < 3; j++) {
                    if (x < floorLength && z + j < floorWidth) {
                        makeWallBlock(x, z + j)
                    }
                }
                break
            }
            case 3: {  // 3x1
                for (let j = 0; j < 3; j++) {
                    if (x + j < floorLength && z < floorWidth) {
                        makeWallBlock(x + j, z)
                    }
                }
                break
            }
            case 4: { // 2x2
                for (let j = 0; j < 2; j++) {
                    for (let k = 0; k < 2; k++) {
                        if (x + j < floorLength && z + k < floorWidth) {
                            makeWallBlock(x + j, z + k)
                        }
                    }
                }
                break
            }
        }
    }
}

// Pathfinding grid gen
function genPathfindingGrid() {
    for (let x = 0; x < floorLength; x++) {
        for (let z = 0; z < floorWidth; z++) {
            if (grid[z][x].isWall) {
                continue
            }
            const connectsTo = grid[z][x].connectsTo
            // "+" path
            if (z + 1 < floorWidth && !grid[z + 1][x].isWall) {
                connectsTo.push([x, z + 1])
            }
            if (z - 1 >= 0 && !grid[z - 1][x].isWall) {
                connectsTo.push([x, z - 1])
            }
            if (x + 1 < floorLength && !grid[z][x + 1].isWall) {
                connectsTo.push([x + 1, z])
            }
            if (x - 1 >= 0 && !grid[z][x - 1].isWall) {
                connectsTo.push([x - 1, z])
            }
        }
    }
}

genGrid()
buildFloor()
buildRoof()
buildBorders()
buildWalls()
genPathfindingGrid()
// =======

// ======= Player Variables =======
let playerSpeed = 0.05
let sprint = 100
// =======

// ======= Safety Movement =======
function safeMoveForward(amt) {
    controls.moveForward(amt)
    let x = Math.round(controls.getObject().position.x)
    let z = Math.round(controls.getObject().position.z)
    if (z < 0 || z >= floorWidth || x < 0 || x >= floorLength) {
        controls.moveForward(-amt)
        return
    }
    if (grid[z][x].isWall) {
        controls.moveForward(-amt)
    }
}
function safeMoveRight(amt) {
    controls.moveRight(amt)
    let x = Math.round(controls.getObject().position.x)
    let z = Math.round(controls.getObject().position.z)
    if (z < 0 || z >= floorWidth || x < 0 || x >= floorLength) {
        controls.moveRight(-amt)
        return
    }
    if (grid[z][x].isWall) {
        controls.moveRight(-amt)
    }
}
function spawn() {
    let x = Math.round(Math.random() * floorLength)
    let z = Math.round(Math.random() * floorWidth)
    while (grid[z][x].isWall) {
        x = Math.round(Math.random() * floorLength)
        z = Math.round(Math.random() * floorWidth)
    }
    camera.position.x = x
    camera.position.z = z
}

// ======= Key State =======
const keyState = {}
document.addEventListener('keydown', (event) => {keyState[event.code] = true;});
document.addEventListener('keyup', (event) => {keyState[event.code] = false;});
function handleKeyState() {
    if (!gameOver) {
        if (keyState['KeyW']) safeMoveForward(playerSpeed);
        if (keyState['KeyS']) safeMoveForward(-playerSpeed);
        if (keyState['KeyA']) safeMoveRight(-playerSpeed);
        if (keyState['KeyD']) safeMoveRight(playerSpeed);
        if (keyState['ShiftLeft'] && sprint > 1) {
            playerSpeed = 0.15
            sprint -= 1
        } else {
            playerSpeed = 0.05
            if (sprint < 100) {
                sprint += 0.25
            }
        }
    }
}
// =======

// ======= OoHoos =======
const OooHooGeo = new BoxGeometry(1.2, 1.2, 0.01)
const textureLoader = new THREE.TextureLoader()
const texture_message = [
    ['oohoo1_cat',       'You were eaten by a cat.'],
    ['oohoo2_christian', 'You were consumed by a carnivore.'],
    ['oohoo3_eleanor',   'You were bullied by a girl.'],
    ['oohoo4_will',      'You were caught by a little kid.'],
    ['oohoo5_willi',     'You were overcome by William.']
]
const OoHoos_TargetSquare_Path = [
]  // {OoHoo: mesh, TargetSquare: [x,z], Path: [[x, z],...]}
for (let i = 0; i < texture_message.length; i++) {
    let texture = textureLoader.load('./OoHoos/' + texture_message[i][0] + '.png')
    let OoHooMat = new MeshBasicMaterial({map: texture})
    let OoHoo = new Mesh(OooHooGeo, OoHooMat)
    OoHoos_TargetSquare_Path.push({OoHoo: OoHoo, TargetSquare: [null, null], Path: []})
    scene.add(OoHoo)
    OoHoo.position.set(1, 1.5, 0)
    OoHoo.ooHooMessage = texture_message[i][1]
}
function setTargetSquare(i) {
    const OoHoo = OoHoos_TargetSquare_Path[i].OoHoo
    const TargetSquare = OoHoos_TargetSquare_Path[i].TargetSquare
    const Path = OoHoos_TargetSquare_Path[i].Path
    if (OoHoo.position.distanceTo(camera.position) < 30) {
        TargetSquare[0] = Math.abs(Math.round(camera.position.x))
        TargetSquare[1] = Math.abs(Math.round(camera.position.z))
        return true
//        console.log('Player target...')
    } else {
        // Don't create new random target square if prev target is not reached
        if (Path.length === 0) {
            let x = Math.abs(Math.round(Math.random() * floorLength))
            let z = Math.abs(Math.round(Math.random() * floorWidth))
            while (grid[z][x].isWall) {
                x = Math.round(Math.random() * floorLength)
                z = Math.round(Math.random() * floorWidth)
            }
            TargetSquare[0] = x
            TargetSquare[1] = z
            return true
//            console.log('Random target...')
        }
        return false
    }
    // console.log('Target Selected:', TargetSquare)
}
function findPath(i) {
    const OoHoo = OoHoos_TargetSquare_Path[i].OoHoo
    const TargetSquare = OoHoos_TargetSquare_Path[i].TargetSquare

    let q = [[[Math.round(OoHoo.position.x), Math.round(OoHoo.position.z)], []]]  // [Square, [path]]
    let path = []
    const marked = []
    for (let z = 0; z < floorWidth; z++)  {
        marked.push([])
        for (let x = 0; x < floorLength; x++) {
            marked[z].push(false)
        }
    }
    while (true) {
        if (q.length === 0) {
            break
        }
        let cur = q.shift()
        let s;
        try {
            s = cur[0]
        } catch (e) {
            console.error(TargetSquare)
            console.error('q:', q)
            console.error('cur:', cur)
            return
        }
        try {
            if (marked[s[1]][s[0]]) {
                continue
            }
        } catch (e) {
            console.error('s:', s)
            console.error('marked:', marked)
            return;
        }
        cur[1].push(s)
        if (s[0] === TargetSquare[0] && s[1] === TargetSquare[1]) {
            path = cur[1]
            break
        }
        let c ;
        try {
            c = grid[s[1]][s[0]].connectsTo
        } catch (e) {
            console.error('s:', s)
            return;
        }
        for (let j = 0; j < c.length; j++) {
            q.push([c[j], Array.from(cur[1])])
        }
        marked[s[1]][s[0]] = true
    }
    // console.log('New Path Made:', path)
    OoHoos_TargetSquare_Path[i].Path = path
}
function stepOoHoo(i) {
    const OoHoo = OoHoos_TargetSquare_Path[i].OoHoo
    const Path = OoHoos_TargetSquare_Path[i].Path
    OoHoo.lookAt(camera.position)
    if (Path.length > 0) {
        let next = Path[0]
        let speedFactor = 95  // Greater = slower
        let sx = (next[0] - OoHoo.position.x) / speedFactor
        let sz = (next[1] - OoHoo.position.z) / speedFactor
        for (let j = 0; j < 10; j++) {
            OoHoo.position.x += sx
            OoHoo.position.z += sz
        }
        if (Math.round(OoHoo.position.x) === next[0] && Math.round(OoHoo.position.z) === next[1]) {
            Path.shift()
        }
    }
    if (OoHoo.position.distanceTo(camera.position) < 1.5) {
        endGame(OoHoo)
    }
}
function endGame(OoHoo) {
    gameOver = true
    controls.unlock()
    controls.disconnect()
    OoHoo.lookAt(camera.position)
    OoHoo.translateZ(0.7)
    const OoHooOrigY = OoHoo.position.y
    setInterval(() => {OoHoo.position.y = OoHooOrigY + Math.random() * (Math.random() > 0.5 ? -0.1 : 0.1)}, 50)
    document.getElementById('deathMessage').textContent = OoHoo.ooHooMessage

    const nofIterations = 20
    const origRot = camera.rotation.clone()
    camera.lookAt(OoHoo.position)
    const newRot = camera.rotation.clone()
    camera.rotation.copy(origRot)
    let diffX = newRot.x - origRot.x
    let diffY = newRot.y - origRot.y
    let diffZ = newRot.z - origRot.z
    let i = 0
    let interval = setInterval(() => {
        camera.rotation.x += diffX /nofIterations
        camera.rotation.y += diffY/nofIterations
        camera.rotation.z += diffZ/nofIterations
        renderer.render(scene, camera)
        i += 1
        if (i === nofIterations) {
            clearInterval(interval)
            camera.rotation.copy(newRot)
            for (let i = 0; i < 500; i++) {
                setTimeout(() => {
                    document.getElementById('gameOverScreen').style.opacity = (i / 500).toString()
                }, i * 10)
            }
        }
    }, 7)
}
async function tickOoHoos() {
    if (!gameOver) {
        for (let i = 0; i < OoHoos_TargetSquare_Path.length; i++) {
            stepOoHoo(i)
            if (tick % 200 === 0) {
                if (setTargetSquare(i)) {  // If new path needs generating
                    findPath(i)
                }
            }
        }
    }
}
// =======

// Todo-maybe: sounds
// Todo-maybe: escape objective (instead of boring "just survive")
// Todo-maybe: multiplayer???

let tick = 0
let gameOver = false
const animate = () => {
    requestAnimationFrame(animate);
    handleKeyState()
    tickOoHoos()
    updateTimer()
    renderer.render(scene, camera)
    tick += 1
//    document.getElementById('hud').textContent = `X:${Math.round(camera.position.x)} Z:${Math.round(camera.position.z)} |Sprint:${sprint}| NofWalls:${nofWalls}; Dist:${OoHoos_TargetSquare_Path[0].OoHoo.position.distanceTo(camera.position)}`
};
let startTime;
let timerInterval;
function startTimer() {
    startTime = Date.now();
    clearInterval(timerInterval); // Clear any existing interval
    timerInterval = setInterval(updateTimer, 1000);
}
async function updateTimer() {
    if (!gameOver) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        document.getElementById('timer').textContent = `Survived: ${formattedMinutes}:${formattedSeconds}`;
    }
}
let started = false
function start() {
    document.body.removeChild(document.getElementById('start'))
    lockControls()
    document.addEventListener('click', lockControls);
    startTimer()
    animate()
}
function main() {
    spawn()
    renderer.render(scene, camera)
    document.addEventListener('click', () => {
        if (!started) {
            started = true;
            start()
        }
    });
}
main()
