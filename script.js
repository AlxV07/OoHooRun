import * as THREE from './ThreeRes/three.module.js'
import {PointerLockControls} from './ThreeRes/PointerLockControls.js';

// ======= Setup =======
let renderer;
let scene;
let camera;
let controls;
let light;
function setup() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.FogExp2(0xffffff, 0.05)
    light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);
    camera = new THREE.PerspectiveCamera(80, window.innerWidth/window.innerHeight, 0.1, 20);
    document.body.appendChild(renderer.domElement);
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject());
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
setup()
// =======

// ======= Effects =======
// Lights
const lightThrobQ = []
function lightThrob(toIntensity) {
    let interval = 150
    let step = (toIntensity - light.intensity) / interval
    let curIntensity = light.intensity
    for (let i = 0; i < interval; i++) {
        lightThrobQ.push(curIntensity + step * i)
    }
    for (let i = 0; i < interval / 4; i++) {
        lightThrobQ.push(toIntensity)
    }
    for (let i = 0; i < interval; i++) {
        lightThrobQ.push(toIntensity - step * i)
    }
}
let throbInterval;
function startRandomThrobbing() {
    throbInterval = setInterval(() => {
        if (Math.random() > 0.7) {
            lightThrob(-1)
        }
    }, 7000)
}
function updateLight() {
    if (!gameOver) {
        if (lightThrobQ.length > 0) {
            let amt = lightThrobQ.shift()
            light.intensity = amt
            ambientSound.setVolume(0.25 + Math.max(0, -amt))
        }
    }
}
// Sounds
const listener = new THREE.AudioListener();
const ambientSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
camera.add(listener);
function loadAndPlayAmbientSound() {
    audioLoader.load('./sounds/ambient_hum.mp3', function (buffer) {
        ambientSound.setBuffer(buffer);
        ambientSound.setLoop(true);
        ambientSound.setVolume(0.1);
        ambientSound.play();
    });
}
let footstepSound1 = new THREE.Audio(listener);
let footstepSound2 = new THREE.Audio(listener);
function loadFootstepSound() {
    audioLoader.load('./sounds/footstep.mp3', function (buffer) {
        footstepSound1.setBuffer(buffer);
        footstepSound1.setVolume(0.7)
        footstepSound2.setBuffer(buffer);
        footstepSound2.setVolume(0.5)
    });
}
// =======

// ======= Maze =======
// Floor
const floorY = 0
const floorLength = 100
const floorWidth = 100
const floorGeo = new THREE.BoxGeometry(1, 1, 1);
const floorMat1 = new THREE.MeshPhongMaterial({color: 0x989898});
const floorMat2 = new THREE.MeshPhongMaterial({color: 0x878787});
function buildFloor() {
    for (let x = 0; x < floorLength; x++) {
        for (let z = 0; z < floorWidth; z++) {
            const floorPiece = ((x + z) % 2 === 0) ? new THREE.Mesh(floorGeo, floorMat1) : new THREE.Mesh(floorGeo, floorMat2);
            floorPiece.position.set(x, floorY, z)
            scene.add(floorPiece);
        }
    }
}

// Roof
const roofY = 4
const roofGeo = new THREE.BoxGeometry(1, 1, 1);
const roofMat = new THREE.MeshPhongMaterial({color: 0x878787});
function buildRoof() {
    for (let x = 0; x < floorLength; x++) {
        for (let z = 0; z < floorWidth; z++) {
            let roofPiece = new THREE.Mesh(roofGeo, roofMat);
            roofPiece.position.set(x, roofY, z)
            scene.add(roofPiece);
        }
    }
}

// Border
function buildBorders() {
    const bMat = new THREE.MeshPhongMaterial({color: 0x343434, wireframe: false});
    const bxGeo = new THREE.BoxGeometry(floorLength + 1, 10, 1)
    const bx1 = new THREE.Mesh(bxGeo, bMat);
    bx1.position.set(floorLength / 2, floorY, -1)
    scene.add(bx1)
    const bx2 = new THREE.Mesh(bxGeo, bMat);
    bx2.position.set(floorLength / 2, floorY, floorWidth)
    scene.add(bx2)
    const byGeo = new THREE.BoxGeometry(1, 10, floorWidth + 1)
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

// Walls
const minNofWalls = 250
const maxNofWalls = 750
const nofWallTypes = 4  // Remember to implement how each wall type should be built in `buildWalls` method
const nofWalls = Math.round(minNofWalls + Math.random() * (maxNofWalls - minNofWalls))
const wallGeo = new THREE.BoxGeometry(1, 10, 1);
const c1Geo = new THREE.BoxGeometry(0.5, 10, 1);
const c2Geo = new THREE.BoxGeometry(1, 10, 0.5);
const wallMat = new THREE.MeshPhongMaterial({color: 0x565656, wireframe: false});
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
    grid[z][x].isWall = true
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

// `connectsTo` for pathfinding
function updateConnectsToArrays() {
    for (let x = 0; x < floorLength; x++) {
        for (let z = 0; z < floorWidth; z++) {
            if (grid[z][x].isWall) {continue}
            const c = grid[z][x].connectsTo
            // "+" path
            if (z + 1 < floorWidth && !grid[z + 1][x].isWall) {
                c.push([x, z + 1])
            }
            if (z - 1 >= 0 && !grid[z - 1][x].isWall) {
                c.push([x, z - 1])
            }
            if (x + 1 < floorLength && !grid[z][x + 1].isWall) {
                c.push([x + 1, z])
            }
            if (x - 1 >= 0 && !grid[z][x - 1].isWall) {
                c.push([x - 1, z])
            }
        }
    }
}

genGrid()
buildFloor()
buildRoof()
buildBorders()
buildWalls()
updateConnectsToArrays()
// =======

// ======= Player =======
// Variables
let playerSpeed = 0.05
let sprint = 100

// Movement
function safeMoveForward(amt) {
    if (tick % ((playerSpeed===0.15)?15:25) === 0) {if (footstepSound1.isPlaying) {footstepSound2.play();} else {footstepSound1.play();}}
    controls.moveForward(amt)
    let x = Math.round(controls.getObject().position.x)
    let z = Math.round(controls.getObject().position.z)
    if (z < 0 || z >= floorWidth || x < 0 || x >= floorLength || grid[z][x].isWall) {
        controls.moveForward(-amt)
    }
}
function safeMoveRight(amt) {
    if (tick % ((playerSpeed===0.15)?15:25) === 0) {if (footstepSound1.isPlaying) {footstepSound2.play();} else {footstepSound1.play();}}
    controls.moveRight(amt)
    let x = Math.round(controls.getObject().position.x)
    let z = Math.round(controls.getObject().position.z)
    if (z < 0 || z >= floorWidth || x < 0 || x >= floorLength || grid[z][x].isWall) {
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
    camera.position.y = 1.5
    camera.position.x = x
    camera.position.z = z
}

// Key State
const keyState = {}
document.addEventListener('keydown', (event) => {keyState[event.code] = true;});
document.addEventListener('keyup', (event) => {keyState[event.code] = false;});
function handleKeyState() {
    if (!gameOver) {
        if (keyState['ShiftLeft'] && sprint > 1) {
            playerSpeed = 0.15
            sprint -= 1
        } else {
            playerSpeed = 0.05
            if (sprint < 100) {
                sprint += 0.1
            }
        }
        if (keyState['KeyW']) safeMoveForward(playerSpeed);
        if (keyState['KeyS']) safeMoveForward(-playerSpeed);
        if (keyState['KeyA']) safeMoveRight(-playerSpeed);
        if (keyState['KeyD']) safeMoveRight(playerSpeed);
    }
}
// =======

// ======= OoHoos =======
const textureLoader = new THREE.TextureLoader()
const texture_message = [  // Texture, Death Message
    ['oohoo1_cat',       'You were eaten by a cat.'],
    ['oohoo2_christian', 'You were consumed by a carnivore.'],
    ['oohoo3_eleanor',   'You were bullied by a girl.'],
    ['oohoo4_will',      'You were caught by a little kid.'],
    ['oohoo5_willi',     'You were overcome by William.']
]
const OoHoos_TargetSquare_Path = []  // [i] = { OoHoo: mesh, TargetSquare: [x,z], Path: [[x, z],...] }
const OooHooGeo = new THREE.BoxGeometry(1.2, 1.2, 0.01)

function generateOoHoos() {
    for (let i = 0; i < texture_message.length; i++) {
        let texture = textureLoader.load('./OoHoos/' + texture_message[i][0] + '.png')
        let OoHoo = new THREE.Mesh(OooHooGeo, new THREE.MeshPhongMaterial({map: texture}))
        OoHoos_TargetSquare_Path.push({OoHoo: OoHoo, TargetSquare: [null, null], Path: []})
        OoHoo.ooHooMessage = texture_message[i][1]
        OoHoo.position.set(1, 1.5, 0)
        scene.add(OoHoo)
    }
}

function setTargetSquare(i) {
    // Returns whether a new path needs to be generated (true/false)
    const TargetSquare = OoHoos_TargetSquare_Path[i].TargetSquare
    if (OoHoos_TargetSquare_Path[i].OoHoo.position.distanceTo(camera.position) < 30) {
        TargetSquare[0] = Math.abs(Math.round(camera.position.x))
        TargetSquare[1] = Math.abs(Math.round(camera.position.z))
        return true
    } else {
        // Don't create new random target square if prev target is not reached
        if (OoHoos_TargetSquare_Path[i].Path.length === 0) {
            let x = Math.abs(Math.round(Math.random() * floorLength))
            let z = Math.abs(Math.round(Math.random() * floorWidth))
            while (grid[z][x].isWall) {
                x = Math.round(Math.random() * floorLength)
                z = Math.round(Math.random() * floorWidth)
            }
            TargetSquare[0] = x
            TargetSquare[1] = z
            return true
        }
        return false
    }
}

// squareVisited array for flood filling path finding in `findPath`
const squareVisited = []
for (let z = 0; z < floorWidth; z++)  {
    squareVisited.push([])
    for (let x = 0; x < floorLength; x++) {
        squareVisited[z].push(false)
    }
}
function findPath(i) {
    const OoHoo = OoHoos_TargetSquare_Path[i].OoHoo
    const TargetSquare = OoHoos_TargetSquare_Path[i].TargetSquare

    // Reset `squareVisited` array
    for (let z = 0; z < floorWidth; z++)  {
        for (let x = 0; x < floorLength; x++) {
            squareVisited[z][x] = false
        }
    }

    // Flood
    let path = []  // Final path to give to the OoHoo
    let q = [[[Math.round(OoHoo.position.x), Math.round(OoHoo.position.z)], []]]  // [Square, [path]]
    let idx = 0
    while (true) {
        if (idx === q.length) {break}
        let cur = q[idx++]
        let s = cur[0]
        if (squareVisited[s[1]][s[0]]) {continue}
        cur[1].push(s)
        if (s[0] === TargetSquare[0] && s[1] === TargetSquare[1]) {path = cur[1]; break}
        let c = grid[s[1]][s[0]].connectsTo
        for (let j = 0; j < c.length; j++) {q.push([c[j], Array.from(cur[1])])}
        squareVisited[s[1]][s[0]] = true
    }
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
        if (Math.round(OoHoo.position.x) === next[0] && Math.round(OoHoo.position.z) === next[1]) {Path.shift()}
    }
    if (OoHoo.position.distanceTo(camera.position) < 1.5) {endGame(OoHoo)}
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
    const nofIterations = 10
    const origRot = camera.rotation.clone()
    camera.lookAt(OoHoo.position)
    const newRot = camera.rotation.clone()
    camera.rotation.copy(origRot)
    let diffX = newRot.x - origRot.x
    let diffY = newRot.y - origRot.y
    let diffZ = newRot.z - origRot.z
    let i = 0
    ambientSound.setVolume(0.8);
    let interval = setInterval(() => {
        camera.rotation.x += diffX /nofIterations
        camera.rotation.y += diffY/nofIterations
        camera.rotation.z += diffZ/nofIterations
        renderer.render(scene, camera)
        i += 1
        if (i === nofIterations) {
            clearInterval(interval)
            camera.rotation.copy(newRot)
            clearInterval(throbInterval)
            light.intensity = 1
            for (let i = 0; i < 500; i++) {
                setTimeout(() => {
                    document.getElementById('gameOverScreen').style.opacity = (i / 500).toString()
                }, i * 10)
            }
        }
    }, 5)
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
generateOoHoos()
// =======

// ======= Runners =======
let tick = 0
let gameOver = false
const animate = () => {
    requestAnimationFrame(animate);
    handleKeyState()
    tickOoHoos()
    updateLight()
    updateTimer()
    renderer.render(scene, camera)
    tick += 1
};
let startTime;
let timerInterval;
function startTimer() {
    startTime = Date.now();
    clearInterval(timerInterval); // Clear any existing interval
    timerInterval = setInterval(updateTimer, 1000);
}
function updateTimer() {
    if (!gameOver) {
        const elapsedTime = Date.now() - startTime;
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        document.getElementById('timer').textContent = `Survived: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}
let started = false
function main() {
    spawn()
    renderer.render(scene, camera)
    document.addEventListener('click', () => {
        if (!started) {
            started = true;
            document.body.removeChild(document.getElementById('start'))
            controls.lock()
            document.addEventListener('click', () => {controls.lock()});
            startTimer()
            startRandomThrobbing()
            loadAndPlayAmbientSound()
            loadFootstepSound()
            animate()
        }
    });
}
main()
// =======

// Todo-maybe: optional escape objective (instead of boring "just survive") (ideas: find the door + collect keys, cover all ground)

// Todo-maybe: multiplayer???
