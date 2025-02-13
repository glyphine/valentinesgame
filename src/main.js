import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";


k.loadSprite("spritesheet", "./spritesheet.png", {
  sliceX: 39,
  sliceY: 31,
  anims: {
    "idle-down": 936,
    "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
    "idle-side": 975,
    "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
    "idle-up": 1014,
    "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
  },
});

k.loadSprite("map", "./map.png");
k.loadSprite("map2", "./map2.png"); 
k.loadSprite("map3", "./map3.png"); 



k.scene("main", async (data) => {
  const mapData = await (await fetch("./map.json")).json();
  const layers = mapData.layers;

  const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]);
  k.setBackground(k.Color.fromHex("#87CEEB"));

  const player = k.make([
    k.sprite("spritesheet", { anim: "idle-down" }),
    k.area({
      shape: new k.Rect(k.vec2(0, 3), 10, 10),
    }),
    k.body(),
    k.anchor("center"),
    k.pos(),
    k.scale(scaleFactor),
    {
      speed: 220,
      direction: "down",
      isInDialogue: false,
    },
    "player",
  ]);

  let enterpointPosition = null;
  let outpointPosition = null;

  
  for (const layer of layers) {
    if (layer.name === "boundaries") {
      for (const boundary of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);

        if (boundary.name) {
          player.onCollide(boundary.name, () => {
            player.isInDialogue = true;
            displayDialogue(dialogueData[boundary.name], () => {
              player.isInDialogue = false;
            });
          });
        }
      }
    }

    if (layer.name === "spawnpoint") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          enterpointPosition = k.vec2(
            (map.pos.x + entity.x) * scaleFactor,
            (map.pos.y + entity.y) * scaleFactor
          );
          k.add(player);
        }
      }
    }

    if (layer.name === "enterpoint") {
      for (const obj of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), obj.width || 32, obj.height || 32),
          }),
          k.body({ isStatic: true }),
          k.pos(obj.x, obj.y),
          "enterpoint",
        ]);

        enterpointPosition = k.vec2(obj.x, obj.y);
      }
    }

    if (layer.name === "outpoint") {
        for (const obj of layer.objects) {
          // Adjust the position based on scale and map offset
          const outpointX = (map.pos.x + obj.x) * scaleFactor;
          const outpointY = (map.pos.y + obj.y) * scaleFactor;
      
          map.add([
            k.area({
              shape: new k.Rect(k.vec2(0), (obj.width || 32) * scaleFactor, (obj.height || 32) * scaleFactor),
            }),
            k.body({ isStatic: true }),
            k.pos(outpointX, outpointY),
            "outpoint",
          ]);
      
          // Save the outpoint position
          outpointPosition = k.vec2(outpointX, outpointY);
        }
      }
      
  }

  
  // Determine the player's starting position
  if (data && data.exitPoint === "outpoint" && outpointPosition) {
    player.pos = outpointPosition;
  } else if (enterpointPosition) {
    player.pos = enterpointPosition;
  }

  setCamScale(k);

  k.onResize(() => {
    setCamScale(k);
  });

  k.onUpdate(() => {
    k.camPos(player.worldPos().x, player.worldPos().y - 100);
  });

  player.onCollide("enterpoint", () => {
    document.body.style.transition = "opacity 1s ease"; // Smooth fade-out
    document.body.style.opacity = 0; // Fade out before switching
    setTimeout(() => {
      k.go("map2", { exitPoint: "spawnpoint" });
      document.body.style.opacity = 1; // Fade back in
    }, 1000); // Delay to match fade-out
  });

  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);

    const lowerBound = 50;
    const upperBound = 125;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      return;
    }

    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  function stopAnims() {
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }
    if (player.direction === "up") {
      player.play("idle-up");
      return;
    }

    player.play("idle-side");
  }

  k.onMouseRelease(stopAnims);

  
  k.onKeyRelease(() => {
    stopAnims();
  });
  k.onKeyDown((key) => {
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];

    let nbOfKeyPressed = 0;
    for (const key of keyMap) {
      if (key) {
        nbOfKeyPressed++;
      }
    }

    if (nbOfKeyPressed > 1) return;

    if (player.isInDialogue) return;
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }

    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }

    if (keyMap[2]) {
      if (player.curAnim() !== "walk-up") player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }

    if (keyMap[3]) {
      if (player.curAnim() !== "walk-down") player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
});


//scene 2
k.scene("map2", async (data) => {
  const map2Data = await (await fetch("./map2.json")).json();
  const layers = map2Data.layers;

  const map2 = k.add([k.sprite("map2"), k.pos(0), k.scale(scaleFactor)]);
  k.setBackground(k.Color.fromHex("#311047"));

  const player = k.add([
    k.sprite("spritesheet", { anim: "idle-down" }),
    k.area({ shape: new k.Rect(k.vec2(0, 3), 10, 10) }),
    k.body(),
    k.anchor("center"),
    k.pos(50, 50), // Adjust initial position
    k.scale(scaleFactor),
    {
      speed: 250,
      direction: "down",
      isInDialogue: false,
      hasKey: false,
    },
    "player",
  ]);

  let doorPosition = null;
  let insidehomePosition = null;
  let keyPosition = null; // Position of the key
  let keyDialogue = "You have picked up the key!";  // Dialogue when the key is picked up
  let doorLockedDialogue = "The door is locked. You need a key."; // Dialogue when the door is locked
  let doorUnlockedDialogue = "You unlocked the door!"; // Dialogue when the door is unlocked
   
  // Handle layers in map2.json
  for (const layer of layers) {
    if (layer.name === "boundaries") {
      for (const boundary of layer.objects) {
        map2.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);

        if (boundary.name) {
          player.onCollide(boundary.name, () => {
            player.isInDialogue = true;
            displayDialogue(dialogueData[boundary.name], () => {
              player.isInDialogue = false;
            });
          });
        }
      }
    }

    if (layer.name === "spawnpoint") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          player.pos = k.vec2(
            (map2.pos.x + entity.x) * scaleFactor,
            (map2.pos.y + entity.y) * scaleFactor
          );
        }
      }
    }

    if (layer.name === "exit") {
      for (const obj of layer.objects) {
        map2.add([
          k.area({
            shape: new k.Rect(k.vec2(0), obj.width || 32, obj.height || 32),
          }),
          k.body({ isStatic: true }),
          k.pos(obj.x, obj.y),
          "exit",
        ]);
      }
    }



    if (layer.name === "insidehome") {
      for (const obj of layer.objects) {
        // Adjust the position based on the scale and map offset
        const insideHomeX = (map2.pos.x + obj.x) * scaleFactor;
        const insideHomeY = (map2.pos.y + obj.y) * scaleFactor;
    
        map2.add([
          k.area({
            shape: new k.Rect(k.vec2(0), (obj.width || 32) * scaleFactor, (obj.height || 32) * scaleFactor),
          }),
          k.body({ isStatic: true }),
          k.pos(insideHomeX, insideHomeY), // Position the object based on adjusted coordinates
          "insidehome",
        ]);
      }
    }
    

    // Handle Key Layer (the key object)
    if (layer.name === "key") {
      for (const obj of layer.objects) {
        map2.add([
          k.area({
            shape: new k.Rect(k.vec2(0), obj.width || 32, obj.height || 32),
          }),
          k.body({ isStatic: true }),
          k.pos(obj.x, obj.y),
          "key", // Add a key object to interact with
        ]);
        keyPosition = k.vec2(obj.x, obj.y);
         // Store the position of the key
      }
    }

    // Handle Door Layer
    if (layer.name === "door") {
      for (const obj of layer.objects) {
        map2.add([
          k.area({
            shape: new k.Rect(k.vec2(0), obj.width || 32, obj.height || 32),
          }),
          k.body({ isStatic: true }),
          k.pos(obj.x, obj.y),
          "door", // Door to interact with
        ]);
        doorPosition = k.vec2(obj.x, obj.y); // Store door position
      }
    }
  
  }

  player.onCollide("key", () => {
    if (!player.hasKey) {
      player.hasKey = true; // Set the player as having the key
  
      // Show the key icon on the left side of the screen immediately
      document.getElementById("key-icon").style.display = "block";
  
      // Show the dialogue box
      const dialogueBox = document.getElementById("key-dialogue");
      const dialogueMessage = document.getElementById("dialogue-message");
      dialogueMessage.innerHTML = "You have picked up the key!"; // Set the dialogue message
      dialogueBox.style.display = "block"; // Show the dialogue box
  
      // Close the dialogue when the player clicks the close button
      document.getElementById("close-dialogue").addEventListener("click", () => {
        dialogueBox.style.display = "none"; // Hide the dialogue box
        k.get("key")[0].destroy(); // Remove the key from the map
      });
    }
  });
  

  // Handle Door Interaction
  player.onCollide("door", () => {
    if (player.hasKey) {
      // If player has the key, proceed to next map (or open door)
      displayDialogue(doorUnlockedDialogue, () => {
        document.body.style.transition = "opacity 1s ease"; // Smooth fade-out
        document.body.style.opacity = 0; // Fade out before switching
        setTimeout(() => {
          k.go("map3", { exitPoint: "spawnpoint" }); // Transition to map3
          document.body.style.opacity = 1; // Fade back in
        }, 1000); // Delay to match fade-out
        document.getElementById("key-icon").style.display = "none";
      });
    } else {
      // If player doesn't have the key, show a message
      displayDialogue(doorLockedDialogue, () => {});
    }
  });
 

  player.onCollide("exit", () => {
    document.body.style.transition = "opacity 1s ease"; // Smooth fade-out
    document.body.style.opacity = 0; // Fade out before switching
    setTimeout(() => {
      k.go("main", { exitPoint: "outpoint" });
      document.body.style.opacity = 1; // Fade back in
    }, 1000); // Delay to match fade-out
  });


  setCamScale(k);

  k.onResize(() => setCamScale(k));

  k.onUpdate(() => {
    k.camPos(player.worldPos().x, player.worldPos().y - 100);
  });

  // Mouse controls for player movement
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);

    const lowerBound = 50;
    const upperBound = 125;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      return;
    }

    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  function stopAnims() {
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }
    if (player.direction === "up") {
      player.play("idle-up");
      return;
    }

    player.play("idle-side");
  }

  k.onMouseRelease(stopAnims);

  k.onKeyRelease(() => {
    stopAnims();
  });

  k.onKeyDown((key) => {
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];

    let nbOfKeyPressed = 0;
    for (const key of keyMap) {
      if (key) {
        nbOfKeyPressed++;
      }
    }

    if (nbOfKeyPressed > 1) return;

    if (player.isInDialogue) return;
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }

    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }

    if (keyMap[2]) {
      if (player.curAnim() !== "walk-up") player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }

    if (keyMap[3]) {
      if (player.curAnim() !== "walk-down") player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
});



//scene 3
//++++++++++++__________________________________________________________________++++++++++++++++++++++++++++++++++++
k.scene("map3", async (data) => {
  const map3Data = await (await fetch("./map3.json")).json();
  const layers = map3Data.layers;

  const map3 = k.add([k.sprite("map3"), k.pos(0), k.scale(scaleFactor)]);
  k.setBackground(k.Color.fromHex("#87CEEB"));

  // Create the player sprite
  const player = k.add([
    k.sprite("spritesheet", { anim: "idle-down" }),
    k.area({ shape: new k.Rect(k.vec2(0, 3), 10, 10) }),
    k.body(),
    k.anchor("center"),
    k.pos(), // Default position, will be adjusted from spawn
    k.scale(scaleFactor),
    {
      speed: 220,
      direction: "down",
      isInDialogue: false,
    },
    "player",
  ]);

  let outpoint2Position = null;
  let exit2Position = null;
  let enterpoint2Position = null;
  let gwynPosition = null;

  // Handle layers in map3.json
  for (const layer of layers) {
    if (layer.name === "boundaries") {
      for (const boundary of layer.objects) {
        map3.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }),
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);
        if (boundary.name) {
          player.onCollide(boundary.name, () => {
            player.isInDialogue = true;
            displayDialogue(dialogueData[boundary.name], () => {
              player.isInDialogue = false;
            });
          });
        }
      }
    }

    // Set spawn position for player based on "spawnpoint"
    if (layer.name === "spawnpoint") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          // Log the spawnpoint coordinates for debugging
          console.log("Spawnpoint coordinates:", entity.x, entity.y);
          enterpoint2Position = k.vec2(
            (map3.pos.x + entity.x) * scaleFactor,
            (map3.pos.y + entity.y) * scaleFactor
          );
          //console.log("Calculated spawn position:", enterpoint2Position);
        }
      }
    }

    // Set exit2 position
    if (layer.name === "exit2") {
      for (const obj of layer.objects) {
        map3.add([
          k.area({
            shape: new k.Rect(k.vec2(0), obj.width || 32, obj.height || 32),
          }),
          k.body({ isStatic: true }),
          k.pos(obj.x, obj.y),
          "exit2",
        ]);
        exit2Position = k.vec2(obj.x, obj.y); // Save exit2 position
      }
    }

    // Set outpoint2 position (for the player to leave the map)
    if (layer.name === "outpoint2") {
      for (const obj of layer.objects) {
        // Adjust the position based on scale and map offset
        const outpointX = (map3.pos.x + obj.x) * scaleFactor;
        const outpointY = (map3.pos.y + obj.y) * scaleFactor;

        map3.add([
          k.area({
            shape: new k.Rect(k.vec2(0), (obj.width || 32) * scaleFactor, (obj.height || 32) * scaleFactor),
          }),
          k.body({ isStatic: true }),
          k.pos(outpointX, outpointY),
          "outpoint2",
        ]);

        // Save the outpoint2 position
        outpoint2Position = k.vec2(outpointX, outpointY);
      }
    }
    if (layer.name === "insidehome") {
      for (const obj of layer.objects) {
        // Adjust the position based on the scale and map offset
        const insideHomeX = (map2.pos.x + obj.x) * scaleFactor;
        const insideHomeY = (map2.pos.y + obj.y) * scaleFactor;
    
        map2.add([
          k.area({
            shape: new k.Rect(k.vec2(0), (obj.width || 32) * scaleFactor, (obj.height || 32) * scaleFactor),
          }),
          k.body({ isStatic: true }),
          k.pos(insideHomeX, insideHomeY), // Position the object based on adjusted coordinates
          "insidehome",
        ]);
      }
    }

    if (layer.name === "gwyn") {
      for (const obj of layer.objects) {
        map3.add([
          k.area({
            shape: new k.Rect(k.vec2(0), obj.width || 32, obj.height || 32),
          }),
          k.body({ isStatic: true }),
          k.pos(obj.x, obj.y),
          "gwyn", 
        ]);
        gwynPosition = k.vec2(obj.x, obj.y);
      }
    }
    
  }

  // Now we need to determine where to spawn the player
  if (data && data.exitPoint3 === "enterpoint2" && enterpoint2Position) {
    // Log spawn point
    //console.log("Spawning at enterpoint2:", enterpoint2Position);
    player.pos = enterpoint2Position; // Spawn at enterpoint2 position
  } else if (outpoint2Position) {
    // Log outpoint2 position
    //console.log("Spawning at outpoint2:", outpoint2Position);
    player.pos = outpoint2Position; // Default spawn if no exitPoint3
  } else if (exit2Position) {
    // If no other positions are found, use the exit2 position
    player.pos = exit2Position;
  }

  // Handle the interaction with Gwyn
  player.onCollide("gwyn", () => {
    // Check if player is colliding with Gwyn, then trigger the cutscene
    if (!player.isInDialogue) {
      player.isInDialogue = true;
  
      // Display the dialogue
      displayDialogue('<b>Gwyn: <span style="color:	#663399;"> H...How did you find me??</span></b>', () => {
        // Once the dialogue finishes, trigger the fade-out and redirection
  
        // Start the fade-out transition
        document.body.style.transition = "opacity 1s ease"; // Smooth fade-out transition
        document.body.style.opacity = 0; // Fade out
  
        // After fade-out is complete, redirect to the cutscene HTML page
        setTimeout(() => {
          window.location.href = "gwyn.html"; // Redirect to the cutscene HTML page
        }, 1000); // Delay matches the fade-out duration
      });
    }
  });
  
  

  // Handle transition to map2 when colliding with exit2
  player.onCollide("exit2", () => {
    document.body.style.transition = "opacity 1s ease"; // Smooth fade-out
    document.body.style.opacity = 0; // Fade out before switching
    setTimeout(() => {
      k.go("map2", { exitPoint3: "insidehome" }); // Passing insidehome to map2
      document.body.style.opacity = 1; // Fade back in
    }, 1000); // Delay to match fade-out
  });
  // Camera settings
  k.onUpdate(() => {
    k.camPos(player.worldPos().x, player.worldPos().y - 100);
  });

  setCamScale(k);

  k.onResize(() => setCamScale(k));

  // Mouse controls for player movement
  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);

    const lowerBound = 50;
    const upperBound = 125;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      return;
    }

    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  // Handle keyboard controls
  function stopAnims() {
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }
    if (player.direction === "up") {
      player.play("idle-up");
      return;
    }

    player.play("idle-side");
  }

  k.onMouseRelease(stopAnims);

  k.onKeyRelease(() => {
    stopAnims();
  });

  k.onKeyDown((key) => {
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];

    let nbOfKeyPressed = 0;
    for (const key of keyMap) {
      if (key) {
        nbOfKeyPressed++;
      }
    }

    if (nbOfKeyPressed > 1) return;

    if (player.isInDialogue) return;
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }

    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }

    if (keyMap[2]) {
      if (player.curAnim() !== "walk-up") player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }

    if (keyMap[3]) {
      if (player.curAnim() !== "walk-down") player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
});



  
  

k.go("main");