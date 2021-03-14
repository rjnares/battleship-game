document.addEventListener("DOMContentLoaded", () => {
  /* Game Mode */
  const PLAY_AI = 0;
  const PLAY_ONLINE = 1;

  /* Current Turn */
  const ENEMY = 0;
  const PLAYER = 1;
  let currentTurn = null;
  let cellFireId = null;

  /* Grids */
  const playerGrid = document.querySelector(".grid-player");
  const enemyGrid = document.querySelector(".grid-enemy");
  const chooseShipsGrid = document.querySelector(".grid-choose-ships");

  /* Grid Cells */
  const playerCells = [];
  const enemyCells = [];
  const CELL_SIDE = 10;

  /* All Ship Elements */
  const allShipElements = document.querySelectorAll(".ship");

  /* Ship Classes */
  const carrier = document.querySelector(".carrier-container");
  const battleship = document.querySelector(".battleship-container");
  const cruiser = document.querySelector(".cruiser-container");
  const submarine = document.querySelector(".submarine-container");
  const destroyer = document.querySelector(".destroyer-container");

  /* Game Functions */
  const setupButtons = document.querySelector(".setup-buttons");
  const startGameButton = document.querySelector("#start-game");
  const rotateShipsButton = document.querySelector("#rotate-ships");
  const currentTurnDisplay = document.querySelector("#current-turn");
  const gameInfoDisplay = document.querySelector("#game-info");

  /* Player Info */
  let playerNum = 0;
  let playerReady = false;
  let enemyReady = false;
  let allShipsPlaced = false;

  /* Create Game Grids */
  function createGameGrid(grid, cells) {
    for (let i = 0; i < CELL_SIDE * CELL_SIDE; i++) {
      const cell = document.createElement("div");
      cell.dataset.id = i;
      grid.appendChild(cell);
      cells.push(cell);
    }
  }

  /* Create Player & Enemy Game Grids */
  createGameGrid(playerGrid, playerCells);
  createGameGrid(enemyGrid, enemyCells);

  /* Ship Class Models */
  const shipArray = [
    {
      name: "carrier",
      directions: [
        [0, 1, 2, 3, 4],
        [0, CELL_SIDE, 2 * CELL_SIDE, 3 * CELL_SIDE, 4 * CELL_SIDE],
      ],
    },
    {
      name: "battleship",
      directions: [
        [0, 1, 2, 3],
        [0, CELL_SIDE, 2 * CELL_SIDE, 3 * CELL_SIDE],
      ],
    },
    {
      name: "cruiser",
      directions: [
        [0, 1, 2],
        [0, CELL_SIDE, 2 * CELL_SIDE],
      ],
    },
    {
      name: "submarine",
      directions: [
        [0, 1, 2],
        [0, CELL_SIDE, 2 * CELL_SIDE],
      ],
    },
    {
      name: "destroyer",
      directions: [
        [0, 1],
        [0, CELL_SIDE],
      ],
    },
  ];

  /* Play AI Code */
  function playAi() {
    /* Generate random enemy AI ship placement */
    shipArray.forEach((ship) => generateRandomShipLayout(ship));

    /* Add click listener for start game button to start game against enemy AI */
    startGameButton.addEventListener("click", playAiGame);
  }

  /* Play Online Code */
  function playOnline() {
    const socket = io();

    // Get player number
    socket.on("player-number", (num) => {
      if (num == -1) {
        // Did not connect in time to fill one of two spots
        gameInfoDisplay.innerHTML = "Server is full";
      } else {
        // Is one of two players connected
        playerNum = parseInt(num);

        // playerNum == -1 means currentTurn stays null
        if (playerNum == 0) currentTurn = PLAYER;
        if (playerNum == 1) currentTurn = ENEMY;

        console.log(playerNum);

        // Get other player's status to handle being ready before having an opponent connected
        socket.emit("check-players");
      }
    });

    // Another player has connected/disconnected
    socket.on("player-connection", (num) => {
      console.log(`Player number ${num} has connected or disconnected`);
      playerConnectedOrDisconnected(num);
    });

    function playerConnectedOrDisconnected(num) {
      const number = parseInt(num);
      let player = `.p${number + 1}`;

      document.querySelector(`${player} .connected`).classList.toggle("active");

      if (number == playerNum) {
        document.querySelector(player).style.fontWeight = "bold";
      }
    }

    // On enemy read
    socket.on("enemy-ready", (num) => {
      enemyReady = true;
      setReady(num);

      if (playerReady) playOnlineGame(socket);
    });

    // Check player
    socket.on("check-players", (players) => {
      players.forEach((player, index) => {
        if (player.connected) playerConnectedOrDisconnected(index);
        if (player.ready) {
          setReady(index);
          if (index !== playerNum) enemyReady = true;
        }
      });
    });

    // On timeout
    socket.on("timeout", () => {
      gameInfoDisplay.innerHTML = "You have reached the 10 minute limit";
    });

    // Set up event listeners for firing
    enemyCells.forEach((cell) => {
      cell.addEventListener("click", () => {
        if (currentTurn == PLAYER && playerReady && enemyReady) {
          cellFireId = cell.dataset.id;
          socket.emit("fire", cellFireId);
        }
      });
    });

    // On fire received
    socket.on("fire", (id) => {
      enemyTurn(id);
      const cell = playerCells[id];
      socket.emit("fire-reply", cell.classList);
      playOnlineGame(socket);
    });

    // On fire reply received
    socket.on("fire-reply", (cellClassObject) => {
      revealEnemyCell(cellClassObject);
      playOnlineGame(socket);
    });

    startGameButton.addEventListener("click", () => {
      if (allShipsPlaced) playOnlineGame(socket);
      else gameInfoDisplay.innerHTML = "All ships must be placed";
    });
  }

  /* Game Mode Selection */
  if (gameMode == PLAY_AI) playAi();
  else playOnline();

  function isValidStart(start, shipLength, direction) {
    if (direction) {
      // if vertical, only need to check upper limit on start cell
      const upperLimit = 99 - (shipLength - 1) * CELL_SIDE;

      return start <= upperLimit;
    } else {
      // if horizontal, need to check the mod of upper limit since it varies for each row
      const upperModLimit = CELL_SIDE - shipLength;
      const startModValue = start % CELL_SIDE;

      return startModValue <= upperModLimit;
    }
  }

  function isFilled(start, direction) {
    // check if any cells of current ship are already filled by another ship
    return direction.some((index) =>
      enemyCells[start + index].classList.contains("filled")
    );
  }

  // Generate random AI ship layout
  // TODO: Make function take a grid as input so that users can press button to make a random ship layout for them too
  function generateRandomShipLayout(ship) {
    const shipIndexes = ship.directions;
    const shipLength = shipIndexes[0].length;

    // Chooses vertical or horizontal placement randomly
    const randomDirection = Math.floor(Math.random() * 2);
    const currentDirection = shipIndexes[randomDirection];

    // Choose random start from cells 0 - 99
    let randomStart = Math.floor(Math.random() * 100);

    // While valid random start is not found OR cell(s) already taken, generate new one
    while (
      !isValidStart(randomStart, shipLength, randomDirection) ||
      isFilled(randomStart, currentDirection)
    ) {
      // Choose NEW random start from cells 0 - 99
      randomStart = Math.floor(Math.random() * 100);
    }

    // If here, then we have both valid random start and no cells are already filled
    currentDirection.forEach((index) =>
      enemyCells[randomStart + index].classList.add("filled", ship.name)
    );
  }

  // Rotate ships by toggling (adding/removing) a vertical css style of ships
  const HORIZONTAL = "H";
  const VERTICAL = "V";

  // Horizontal init by default
  let orientation = HORIZONTAL;

  function rotateShips() {
    carrier.classList.toggle("carrier-container-vertical");
    battleship.classList.toggle("battleship-container-vertical");
    cruiser.classList.toggle("cruiser-container-vertical");
    submarine.classList.toggle("submarine-container-vertical");
    destroyer.classList.toggle("destroyer-container-vertical");

    orientation = orientation == HORIZONTAL ? VERTICAL : HORIZONTAL;
  }

  rotateShipsButton.addEventListener("click", rotateShips);

  // Drag/place ships
  let selectedShipNameWithIndex = null;
  let draggedShip = null;
  let draggedShipLength = null;

  allShipElements.forEach((ship) =>
    ship.addEventListener("mousedown", (e) => {
      selectedShipNameWithIndex = e.target.id;
    })
  );

  allShipElements.forEach((ship) =>
    ship.addEventListener("dragstart", dragStart)
  );

  playerCells.forEach((cell) => cell.addEventListener("dragstart", dragStart));

  playerCells.forEach((cell) => cell.addEventListener("dragend", dragEnd));

  playerCells.forEach((cell) => cell.addEventListener("dragover", dragOver));

  playerCells.forEach((cell) => cell.addEventListener("dragenter", dragEnter));

  playerCells.forEach((cell) => cell.addEventListener("dragleave", dragLeave));

  playerCells.forEach((cell) => cell.addEventListener("drop", dragDrop));

  function dragStart() {
    draggedShip = this;
    draggedShipLength = draggedShip.children.length;
  }

  function dragEnd() {}

  function dragOver(event) {
    event.preventDefault();
  }

  function dragEnter(event) {
    event.preventDefault();
  }

  function dragLeave() {}

  function canPlace(dropCellId, selectedShipIndex) {
    for (let i = 0; i < draggedShipLength; i++) {
      const cellPlaceId =
        orientation == HORIZONTAL
          ? dropCellId - selectedShipIndex + i
          : dropCellId - selectedShipIndex * CELL_SIDE + i * CELL_SIDE;
      const filled = playerCells[cellPlaceId].classList.contains("filled");
      if (filled) return false;
    }

    return true;
  }

  function dragDrop() {
    const dropCellId = parseInt(this.dataset.id);
    const selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1));

    if (!canPlace(dropCellId, selectedShipIndex)) return;

    const shipClass = selectedShipNameWithIndex.slice(0, -2);
    const lastShipIndex = parseInt(draggedShip.lastElementChild.id.substr(-1));

    if (orientation == HORIZONTAL) {
      /* Use drop cell id to find row min/max cell ids */
      const rowMinCellId = dropCellId - (dropCellId % CELL_SIDE);
      const rowMaxCellId = rowMinCellId + CELL_SIDE - 1;

      /* Use drop cell id and selected ship index to find start/end cell ids */
      const startCellId = dropCellId - selectedShipIndex;
      const endCellId = dropCellId + (lastShipIndex - selectedShipIndex);

      /* If rowMinCellId <= startCellId < endCellId <= rowMaxCellId, then allow placement */
      if (
        rowMinCellId <= startCellId &&
        startCellId < endCellId &&
        endCellId <= rowMaxCellId
      ) {
        /* Place Ship */
        for (let i = 0; i < draggedShipLength; i++) {
          const cellPlaceId = dropCellId - selectedShipIndex + i;
          let startOrEndClass = "";

          if (i == 0) startOrEndClass = "start";
          if (i == draggedShipLength - 1) startOrEndClass = "end";

          /* Set each placed cell as filled and horizontal */
          playerCells[cellPlaceId].classList.add(
            "filled",
            "horizontal",
            shipClass
          );

          if (startOrEndClass)
            playerCells[cellPlaceId].classList.add(startOrEndClass);
        }

        /* Remove ship class from choose ships grid to prevent placing more than one */
        chooseShipsGrid.removeChild(draggedShip);
      }
    } else {
      /* Use drop cell id and selected ship index to find start/end cell ids */
      const startCellId = dropCellId - selectedShipIndex * CELL_SIDE;
      const endCellId =
        dropCellId + (lastShipIndex - selectedShipIndex) * CELL_SIDE;

      /* If 0 <= startCellId < endCellId <= 99, then allow placement */
      if (0 <= startCellId && startCellId < endCellId && endCellId <= 99) {
        /* Place Ship */
        for (let i = 0; i < draggedShipLength; i++) {
          const cellPlaceId =
            dropCellId - selectedShipIndex * CELL_SIDE + i * CELL_SIDE;
          let startOrEndClass = "";

          if (i == 0) startOrEndClass = "start";
          if (i == draggedShipLength - 1) startOrEndClass = "end";

          /* Set each placed cell as filled and vertical */
          playerCells[cellPlaceId].classList.add(
            "filled",
            "vertical",
            shipClass
          );

          if (startOrEndClass)
            playerCells[cellPlaceId].classList.add(startOrEndClass);
        }

        /* Remove ship class from choose ships grid to prevent placing more than one */
        chooseShipsGrid.removeChild(draggedShip);
      }
    }
    /* Check if player has placed all ships */
    if (!chooseShipsGrid.querySelector(".ship")) allShipsPlaced = true;
  }

  const enemyShipHp = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2,
  };

  const playerShipHp = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2,
  };

  function totalShipHp(shipHp) {
    return (
      shipHp.carrier +
      shipHp.battleship +
      shipHp.cruiser +
      shipHp.submarine +
      shipHp.destroyer
    );
  }

  function checkGameOver() {
    /* Check if total player ship HP reaches 0, if so, end game */
    if (totalShipHp(playerShipHp) == 0) {
      gameInfoDisplay.innerHTML += ". Enemy WINS!";
      isGameOver = true;
    }

    /* Check if total enemy ship HP reaches 0, if so, end game */
    if (totalShipHp(enemyShipHp) == 0) {
      gameInfoDisplay.innerHTML += ". You WIN!";
      isGameOver = true;
    }
  }

  function revealEnemyCell(cellClassObject) {
    let info = "";
    const enemyCell = enemyGrid.querySelector(`div[data-id='${cellFireId}']`);
    const cellClassList = Object.values(cellClassObject);

    /* Decrease ship HP only if ship cell hasn't been hit */
    if (
      !enemyCell.classList.contains("hit") &&
      !isGameOver &&
      currentTurn == PLAYER
    ) {
      if (cellClassList.includes("carrier")) {
        if (--enemyShipHp.carrier == 0) info = "and sunk the enemy Carrier";
      }
      if (cellClassList.includes("battleship")) {
        if (--enemyShipHp.battleship == 0)
          info = "and sunk the enemy Battleship";
      }
      if (cellClassList.includes("cruiser")) {
        if (--enemyShipHp.cruiser == 0) info = "and sunk the enemy Cruiser";
      }
      if (cellClassList.includes("submarine")) {
        if (--enemyShipHp.submarine == 0) info = "and sunk the enemy Submarine";
      }
      if (cellClassList.includes("destroyer")) {
        if (--enemyShipHp.destroyer == 0) info = "and sunk the enemy Destroyer";
      }
    }

    /* Set ship cell as hit or miss */
    if (cellClassList.includes("filled")) {
      enemyCell.classList.add("hit");
      gameInfoDisplay.innerHTML = `You landed a hit ${info}`;
    } else {
      enemyCell.classList.add("miss");
      gameInfoDisplay.innerHTML = "You missed";
    }

    currentTurn = ENEMY;
    checkGameOver();

    if (gameMode == PLAY_AI) playAiGame();
  }

  function enemyTurn(cell) {
    let info = "";
    let cellClassList =
      gameMode == PLAY_AI ? null : playerCells[cell].classList;

    if (gameMode == PLAY_AI) {
      do {
        cellClassList = playerCells[Math.floor(Math.random() * 100)].classList;
      } while (cellClassList.contains("hit") || cellClassList.contains("miss"));
    }

    /* Decrease ship HP only if ship cell hasn't been hit */
    if (!cellClassList.contains("hit") && !isGameOver && currentTurn == ENEMY) {
      if (cellClassList.contains("carrier")) {
        if (--playerShipHp.carrier == 0) info = "and sunk your Carrier";
      }
      if (cellClassList.contains("battleship")) {
        if (--playerShipHp.battleship == 0) info = "and sunk your Battleship";
      }
      if (cellClassList.contains("cruiser")) {
        if (--playerShipHp.cruiser == 0) info = "and sunk your Cruiser";
      }
      if (cellClassList.contains("submarine")) {
        if (--playerShipHp.submarine == 0) info = "and sunk your Submarine";
      }
      if (cellClassList.contains("destroyer")) {
        if (--playerShipHp.destroyer == 0) info = "and sunk your Destroyer";
      }
    }

    /* Set ship cell as hit or miss */
    if (cellClassList.contains("filled")) {
      cellClassList.add("hit");
      gameInfoDisplay.innerHTML = `Enemy landed a hit ${info}`;
    } else {
      cellClassList.add("miss");
      gameInfoDisplay.innerHTML = "Enemy missed";
    }

    currentTurn = PLAYER;
    checkGameOver();

    if (gameMode == PLAY_AI) playAiGame();
  }

  /* Game Logic */
  let isGameInit = true;
  let isGameOver = false;

  function playAiGame() {
    /* Initialize Game */
    if (isGameInit) {
      /* Prevent game start unless all player ships are placed */
      if (!allShipsPlaced) {
        gameInfoDisplay.innerHTML = "All ships must be placed";
        return;
      }

      /* Add click listener for enemy cells to handle firing */
      /* Check if player turn to prevent player taking turn during enemy AI turn */
      enemyCells.forEach((cell) => {
        cell.addEventListener("click", () => {
          if (currentTurn == PLAYER) {
            cellFireId = cell.dataset.id;
            revealEnemyCell(cell.classList);
          }
        });
      });

      /* Prevent game start and rotate ship buttons from being clicked during current game */
      /* TODO: Pressing button should reset game with new enemy AI ship placements */
      startGameButton.removeEventListener("click", playAiGame);
      setupButtons.style.display = "none";

      /* Player goes first by default in 'Play AI' mode */
      currentTurn = PLAYER;

      /* Clear previous messages when starting game */
      currentTurnDisplay.innerHTML = "";
      gameInfoDisplay.innerHTML = "";

      /* Set false to prevent game initialization mid-game */
      isGameInit = false;
    }

    if (isGameOver) return;

    if (currentTurn == PLAYER) {
      /* Display Player Turn */
      currentTurnDisplay.innerHTML = "Your Turn";
    } else {
      /* Display Enemy AI Turn */
      currentTurnDisplay.innerHTML = "Enemy AI Turn";

      /* Simulate AI Taking Turn */
      /* TODO: Make a smarter AI */
      setTimeout(enemyTurn, 3000);
    }
  }

  function playOnlineGame(socket) {
    if (isGameOver) return;

    if (!playerReady) {
      socket.emit("player-ready");
      playerReady = true;
      setReady(playerNum);
    }

    if (enemyReady) {
      if (isGameInit) {
        /* Prevent game start and rotate ship buttons from being clicked during current game */
        /* TODO: Pressing button should reset game with new enemy AI ship placements */
        startGameButton.removeEventListener("click", playAiGame);
        setupButtons.style.display = "none";

        /* Clear previous messages when starting game */
        gameInfoDisplay.innerHTML = "";

        isGameInit = false;
      }

      if (currentTurn == PLAYER) currentTurnDisplay.innerHTML = "Your Turn";
      else currentTurnDisplay.innerHTML = "Enemy Turn";
    }
  }

  function setReady(num) {
    const number = parseInt(num);
    let player = `.p${number + 1}`;
    document.querySelector(`${player} .ready`).classList.toggle("active");
  }
});
