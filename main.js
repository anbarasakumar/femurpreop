import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import $ from "jquery";

// declarations
var light1, light2;
const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();
let transformControls, flexExtPlane, flexExtRot, varusValgusPlane, varusValgusRot, distMedialPlane, distResectPlane, distResectPlaneDir;
let isDragging = false
const lineLength = 1; // 10 mm

var femurCenterLM, hipCenterLM, femurProximalCanalLM, femurDistalCanalLM, medialEpicondyleLM, lateralEpicondyleLM, distalMedialPtLM, distalLateralPtLM, posteriorMedialPtLM, posteriorLateralPtLM;
let pixRatio = Math.min(window.devicePixelRatio, 2)
const landMarks = {
    "femurCenter": [0.6839798321898527, 0.5222733634918073, 1.8464234209351105],
    "hipCenter": [-0.958924670904387, 32.650622846680264, 1.222409500332811],
    "lateralEpicondyle": [-2.5790275213907115, 0.917429366469831, -0.7528173207797296],
    "medialEpicondyle": [3.5137758591910915, 0.46692914705082456, -1.942348599232563],
    "posteriorMedialPt": [2.653608389852691, 0.5087753855856818, -2.8920196461250285],
    "distalLateralPt": [-1.3119692493833777, -1.0674791243777682, -0.7056037790762419],
    "distalMedialPt": [2.5185825523381045, -1.2698463239977875, -1.0581881453177828],
    "femurProximalCanal": [-3.5944414567570813, 32.16964688564785, 1.029545488669726],
    "femurDistalCanal": [0.6359404994586368, -0.3760617592796034, 0.5379718470166233],
    "posteriorLateralPt": [-1.6439070484291787, 0.49621929089288486, -2.4183306884823086]
}


// init three js
const scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 10000);
camera.position.set(0, 0, 100);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(pixRatio);
renderer.setClearColor(0x000000, 0);
document.getElementById('mainCanvas').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x8d7c7c, 0x494966, 3));
addShadowedLight(1, 1, 1, 0xffffff, 3.5, light1);
addShadowedLight(0.5, 1, - 1, 0xd0f8ff, 3, light2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 5;
controls.maxDistance = 100;

controls.addEventListener('change', () => {
    isDragging = true
})
controls.addEventListener('end', () => {
    setTimeout(() => {
        isDragging = false
    }, 500)
})

transformControls = new TransformControls(camera, renderer.domElement);
transformControls.size = 0.75;
transformControls.addEventListener('dragging-changed', function (event) {
    if (isDragging) {
        setTimeout(() => {
            isDragging = false
        }, 500)
    } else {
        isDragging = true
    }
    controls.enabled = !event.value;
});
scene.add(transformControls);



window.addEventListener('load', () => {
    loadBones()
    animate();
    $("#distalResectInp").val(10);
    $("#distalResectInp + span").text(10);
    initLandmarks()
})

window.addEventListener('resize', onWindowResize);

$("#mainCanvas canvas").on('click', (event) => {
    event.preventDefault();
    if (!isDragging) {
        transformControls.detach()

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersections = raycaster.intersectObjects(scene.children, false);

        if (intersections.length > 0) {
            const object = intersections[0].object;
            if (object.name === "rightFemurBone" && $(".labelRadio input:checked").length > 0) {
                const targetLandMark = $(".labelRadio input:checked").val()
                transformControls.attach(eval(targetLandMark + "LM"))
            }
        }
    }
})

$(".inputIncDecWrap input").val(0)
$(".decBtn").on("click", function () {
    distResectPlaneDir = 1
    const tarInput = $(this).parent().find("input")
    tarInput.val(parseInt(tarInput.val()) - 1).change()
    $(this).parent().find("span").text(tarInput.val())
})
$(".incBtn").on("click", function () {
    distResectPlaneDir = -1
    const tarInput = $(this).parent().find("input")
    tarInput.val(parseInt(tarInput.val()) + 1).change()
    $(this).parent().find("span").text(tarInput.val())
})
$("#varusValgusInp").on("change", function () {
    varusValgusPlane.rotation.y = varusValgusRot + $(this).val() * Math.PI / 180
})
$("#flexExtInp").on("change", function () {
    flexExtPlane.rotation.y = flexExtRot + $(this).val() * Math.PI / 180
})
$("#distalResectInp").on("change", function () {
    distResectPlane.geometry.translate(0, 0, (lineLength / 10) * distResectPlaneDir);
})
$("#resectInp").on("change", function () {
    if ($("#resectInp:checked").length > 0) {
        $(".distalResectWrap").slideDown()
        distResectPlane.visible = true
    } else {
        $(".distalResectWrap").slideUp()
        distResectPlane.visible = false
    }
})
$(".updateBtn").on("click", function () {
    $(this).addClass("disableState")
    createLines();
    createPlane()
})



// functions start here
function addShadowedLight(x, y, z, color, intensity, targetLight) {

    targetLight = new THREE.DirectionalLight(color, intensity);
    targetLight.position.set(x, y, z);
    scene.add(targetLight);

    targetLight.castShadow = true;

    const d = 1;
    targetLight.shadow.camera.left = - d;
    targetLight.shadow.camera.right = d;
    targetLight.shadow.camera.top = d;
    targetLight.shadow.camera.bottom = - d;

    targetLight.shadow.camera.near = 1;
    targetLight.shadow.camera.far = 4;

    targetLight.shadow.mapSize.width = 1024;
    targetLight.shadow.mapSize.height = 1024;

    targetLight.shadow.bias = - 0.001;

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function loadBones() {
    const loader = new STLLoader();
    const material = new THREE.MeshPhongMaterial({ color: 0xff9c7c, specular: 0x494949, shininess: 30 });
    material.flatShading = false;
    material.opacity = 0.92
    material.transparent = true

    const meshScale = 0.08
    const boneOffsetY = 16.6
    const boneOffsetX = -1

    loader.load('./src/models/stl/Right_Femur.stl', function (geometry) {
        geometry.center();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(boneOffsetX, boneOffsetY, 0);
        mesh.rotation.set(-90 * Math.PI / 180, 0, 0);
        mesh.scale.set(meshScale, meshScale, meshScale);

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = "rightFemurBone";
        scene.add(mesh);
        createLandMarks();
    });
    loader.load('./src/models/stl/Right_Tibia.stl', function (geometry) {
        geometry.center();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(-boneOffsetX, -(boneOffsetY), 0);
        mesh.rotation.set(-90 * Math.PI / 180, 0, 0);
        mesh.scale.set(meshScale, meshScale, meshScale);

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = "rightTibiaBone";
        scene.add(mesh);
    });
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function createLandMarks() {
    for (var key in landMarks) {
        const landMarkPosition = landMarks[key]
        const geometry = new THREE.SphereGeometry(0.3, 10, 10);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: "black" }));
        mesh.position.set(landMarkPosition[0], landMarkPosition[1], landMarkPosition[2]);
        mesh.name = key;
        eval(key + 'LM = mesh')
        scene.add(eval(key + 'LM'));
    }
}

function initLandmarks() {
    $(".labelRadio input").on("click", function () {
        $(".labelRadio input").not(this).prop("checked", false);
        transformControls.detach();
    })
}

function createLines() {
    drawLine("femurCenter", "hipCenter");
    drawLine("femurProximalCanal", "femurDistalCanal");
    drawLine("medialEpicondyle", "lateralEpicondyle");
    drawLine("posteriorMedialPt", "posteriorLateralPt");
}

function drawLine(fromPoints, toPoints) {
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const points = [];
    points.push(new THREE.Vector3(landMarks[fromPoints][0], landMarks[fromPoints][1], landMarks[fromPoints][2]));
    points.push(new THREE.Vector3(landMarks[toPoints][0], landMarks[toPoints][1], landMarks[toPoints][2]));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
}

function createPlane() {
    const width = 10;
    const height = 10;
    const geometry = new THREE.PlaneGeometry(width, height);
    const point1 = new THREE.Vector3(landMarks["femurCenter"][0], landMarks["femurCenter"][1], landMarks["femurCenter"][2]);
    const point2 = new THREE.Vector3(landMarks["hipCenter"][0], landMarks["hipCenter"][1], landMarks["hipCenter"][2]);
    const direction = new THREE.Vector3().subVectors(point1, point2).normalize();

    const material = new THREE.MeshBasicMaterial({
        color: 0x999999,
        side: THREE.DoubleSide,
        opacity: 0.5,
        transparent: true
    });

    // Create the plane mesh:
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(point1.x, point1.y, point1.z);
    plane.lookAt(point2);
    plane.name = "varusValgusPlane"
    varusValgusPlane = plane
    varusValgusRot = plane.rotation.y
    scene.add(plane);

    const point3 = new THREE.Vector3(landMarks["distalMedialPt"][0], landMarks["distalMedialPt"][1], landMarks["distalMedialPt"][2]);
    distMedialPlane = new THREE.Mesh(geometry, material);
    distMedialPlane.position.set(point3.x, point3.y, point3.z);
    distMedialPlane.name = "distMedialPlane"
    distMedialPlane.rotation.copy(plane.rotation)
    scene.add(distMedialPlane);

    const geometry2 = new THREE.PlaneGeometry(width, height);
    distResectPlane = new THREE.Mesh(geometry2, material);
    distResectPlane.position.set(point3.x, point3.y, point3.z);
    distResectPlane.geometry.translate(0, 0, -(lineLength / 10 * parseInt($("#distalResectInp").val())));
    distResectPlane.name = "distResectPlane"
    distResectPlane.rotation.copy(plane.rotation)
    scene.add(distResectPlane);
    distResectPlane.visible = false

    const planeCopy = new THREE.Mesh(geometry, material);
    planeCopy.position.set(point1.x, point1.y, point1.z);
    planeCopy.lookAt(point2);
    flexExtPlane = planeCopy
    flexExtPlane.name = "flexExtPlane"
    flexExtRot = flexExtPlane.rotation.y
    scene.add(flexExtPlane);

    const newPoint = new THREE.Vector3().addVectors(point1, direction.multiplyScalar(lineLength));
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([point1, newPoint]);
    const material2 = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 1 });
    const newLine = new THREE.Line(lineGeometry, material2);
    scene.add(newLine);
}