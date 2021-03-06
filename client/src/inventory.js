import { socket } from "../index.js";

export default class InventoryManager extends Phaser.Scene {

    constructor(scene) {
            super(scene)
            this.scene = scene;

            this.items = [];
            this.coins;

            this.inventoryButton(scene);
        }

        inventoryButton(scene) {
            document.getElementById('inventory_button').onclick = function() {
                scene.inventoryUI = document.getElementById('inventory_container');
                if (scene.inventoryUI.style.display === 'block') {
                    scene.inventoryUI.style.display = 'none';
                } else {
                    scene.inventoryUI.style.display = 'block';
                }
            }
        }

        // Set player inventory to details from server and (re)load UI
        loadItems(playerInventory, coins) {
            this.items = playerInventory;

            // display all items
            for (let i of this.items) {
                if (i.available) {
                    continue;
                }
                this.displayItem(i);
            }

            // set coin value
            this.coins = coins;
            this.displayCoins();
        }

        displayItem(i) {
            // create html <img> for sprite and add to slot
            let img = document.createElement('img');
            img.src = i.props.spritePath;
            let item = document.getElementById(`${'slot' + i.slot}`);
            item.appendChild(img);

            // create tooltip to display item info when player hovers over item
            let infoText = document.createElement('span');
            infoText.classList.add('tooltiptext');
            infoText.innerText = i.props.info;
            item.appendChild(infoText);

            /* 
            // TEST of removeItem function
            let self = this;
            item.onclick = function() {
                console.log('remove item');
                self.removeItem(i.slot);
            }
            */
            
        }

        addItem(item) {

            // check for free inventory slots
            for (let i of this.items) {
                if (!i.available) {
                    continue;
                }
                i.available = false;
                i.props = item;
                this.displayItem(i);
                break;
            }
            console.log(`added ${item.name} to inventory`);

            this.sendInventory();
        }

        removeItem(slotNum) {
            
            // remove item from inventory list
            for (let i of this.items) {
                if (i.available) {
                    continue;
                }
                if (i.slot === slotNum) {
                    i.available = true;
                    console.log(`removed ${i.props.name} from inventory`);
                    delete i.props;

                    // remove displayed DOM elements
                    let item = document.getElementById(`${'slot' + i.slot}`);
                    while (item.firstChild) {
                        item.removeChild(item.firstChild);
                    }
                }
            }

            // send inventory update to server
            this.sendInventory();
        }

        // Checks if specified item name is in player's inventory
        checkItem(itemName) {
            for (let i of this.items) {
                if (i.available) {
                    continue;
                }
                if (i.props.name === itemName) {
                    return i.slot;
                }
            }
            return false;
        }

        checkNumItems(itemName) {
            let itemNum = 0
            for (let i of this.items) {
                if (i.available) {
                    continue;
                }
                if (i.props.name === itemName) {
                    itemNum++;
                }
            }
            return itemNum;
        }

        displayCoins() {
            let coinBag = document.getElementById('coin_bag');
            coinBag.innerText = `${this.coins} coins`;
        }

        // update coin value both locally and on server
        updateCoins(newCoinCount) {
            this.coins = newCoinCount;
            this.displayCoins();
            this.updateCoins();
        }
      
        // send current inventory state to server
        sendInventory() {
            socket.emit('inventory', this.items);
        }

        // send current coin count to server
        updateCoins() {
            socket.emit("updateCoins", this.coins);
        }


} 