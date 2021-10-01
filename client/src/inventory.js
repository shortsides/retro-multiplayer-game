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

        displayCoins() {
            let coinBag = document.getElementById('coin_bag');
            coinBag.innerText = `${this.coins} coins`;
        }

        // update coin value both locally and on server
        updateCoins(newCoinCount) {
            this.coins = newCoinCount;
            this.displayCoins();
            this.sendInventory();
        }
      
        // send current inventory state to server
        sendInventory() {
            socket.emit('inventory', this.items, this.coins);
        }


}