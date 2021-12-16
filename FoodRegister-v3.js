/*
made by @桃乐丝
*/

LIBRARY({
	name: "FoodRegister",
	version: 3,
	shared: true,
	api: "CoreEngine"
});

var ClientSend = function(desc) {
	desc.client && desc.client.send(desc.name, desc.pack);
};

Network.addClientPacket("fr.setCarriedItem",
function(packetData) {
	let id = Network.serverToLocalId(packetData.id);
	let data = packetData.data;
	let count = packetData.count;
	let player = packetData.player;
	if (!player) return;
	Entity.setCarriedItem(player, id, count, data);
});

Network.addClientPacket("fr.addItemToInventory",
function(packetData) {
	let id = Network.serverToLocalId(packetData.id);
	let data = packetData.data;
	let count = packetData.count;
	let player = packetData.player;
	if (!player) return; 
	(new PlayerActor(player)).addItemToInventory(id, count, data, null, true);
});

Callback.addCallback("ItemUsingComplete", 
function(item, playerUid) {
	var client = Network.getClientForPlayer(playerUid);
	if (!client) return;
	Callback.invokeCallback("fr.ItemUsingComplete", item, playerUid, client);
});

var FoodRegister = {
	addCallback: function(id) {
		Callback.addCallback("fr.ItemUsingComplete",
		function(item, playerUid, client) {
			if (item.id == ItemID[id]) {
				new ClientSend({
					client: client,
					name: "fr.setCarriedItem",
					pack: {
						id: Entity.getCarriedItem(playerUid).id,
						count: Entity.getCarriedItem(playerUid).count - 1,
						data: Entity.getCarriedItem(playerUid).data,
						player: playerUid
					}
				});
			};
		});
	},
	registerFoodItem_base: function(id, name, food, desc, func) {
		IDRegistry.genItemID(id);
		Item.createItem(id, name, desc.tex, desc.params);
		Item.setProperties(id, "{\"use_animation\": \"eat\",\"use_duration\": 32,\"food\":{\"nutrition\": " + food + ",\"saturation_modifier\": \"normal\"}}");
		Item.setMaxUseDuration(id, 32);
		Item.setUseAnimation(id, 1);
		this.addCallback(id);
		if (func) Callback.addCallback("fr.ItemUsingComplete", func);
	},
	registerFoodItem_bowl: function(id, name, food, desc, func) {
		IDRegistry.genItemID(id);
		Item.createItem(id, name, desc.tex, desc.params);
		Item.setProperties(id, "{\"use_animation\": \"drink\",\"use_duration\": 32,\"food\":{\"nutrition\": " + food + ",\"saturation_modifier\": \"normal\"}}");
		Item.setMaxUseDuration(id, 32);
		Item.setUseAnimation(id, 2);
		this.addCallback(id);
		Callback.addCallback("fr.ItemUsingComplete",
		function(item, playerUid, client) {
			if (item.id == ItemID[id]) {
				new ClientSend({
					client: client,
					name: "fr.addItemToInventory",
					pack: {
						id: VanillaItemID.bowl,
						count: 1,
						data: 0,
						player: playerUid
					}
				});
			};
		});
		if (func) Callback.addCallback("fr.ItemUsingComplete", func);
	},
	registerFoodItem_bottle: function(id, name, food, desc, func) {
		IDRegistry.genItemID(id);
		Item.createItem(id, name, desc.tex, desc.params);
		Item.setProperties(id, "{\"use_animation\": \"drink\",\"use_duration\": 32,\"food\":{\"nutrition\": " + food + ",\"saturation_modifier\": \"normal\"}}");
		Item.setMaxUseDuration(id, 32);
		Item.setUseAnimation(id, 2);
		this.addCallback(id);
		Callback.addCallback("fr.ItemUsingComplete",
		function(item, playerUid, client) {
			if (item.id == ItemID[id]) {
				new ClientSend({
					client: client,
					name: "fr.addItemToInventory",
					pack: {
						id: VanillaItemID.glass_bottle,
						count: 1,
						data: 0,
						player: playerUid
					}
				});
			};
		});
		if (func) Callback.addCallback("fr.ItemUsingComplete", func);
	},
	register: function(id, name, type, nutrition, desc, func) {
		if (type == "normal") this.registerFoodItem_base(id, name, nutrition, desc, func);
		if (type == "bowl") this.registerFoodItem_bowl(id, name, nutrition, desc, func);
		if (type == "bottle") this.registerFoodItem_bottle(id, name, nutrition, desc, func);
		if (!type || (type != "normal" && type == "bowl" && type == "bottle")) Logger.Log("Missing type !", "ERROR");
	}
};

var SeedRegister = {
    seed: {},
    getDrop: function(blockId) {
        for (var seedId in this.seed) {
            if (this.seed[seedId] == blockId) {
                return seedId;
            };
        };
    }.
    registerDrop: function(seed, blockId) {
        this.seed[seed] = blockId;
    },
    registerSetBlock: function(seed, blockId) {
        Callback.addCallback("ItemUse", function(coords, item, block, isExternal, player) {
            var _coords = coords.relative;
            var blockSource = BlockSource.getDefaultForActor(player);
            if (item.id == seed) {
                if (blockSource.getBlockId(_coords.x, _coords.y, _coords.z) == 0 && _coords.y == coords.y + 1) {
                    if (block.id == VanillaBlockID.farmland) {
                        blockSource.setBlock(_coords.x, _coords.y, _coords.z, block.id, 0);
                        Entity.setCarriedItem(player, item.id, item.count - 1, item.data, item.extra);
                    };
                };
            };
        });
    },
    registerRandomGrown: function(BlockIDarray, type) {
        var former = 0;
        var latter = 1;
        for (var k = 0; k < BlockIDarray.length; k++) {
            if (BlockIDarray[latter]) {
                var formerId = BlockIDarray[former];
                var latterId = BlockIDarray[latter];
                Block.setRandomTickCallback(formerId, function(x, y, z, id, data, blockSource) {
                    blockSource.setBlock(x, y, z, latterId, 0);
                })
                former += 1;
                latter += 1;
            };
            if (type == "normal") {
                Block.registerNeighbourChangeFunctionForID(BlockIDarray[k], function(coords, block, changedCoords, blockSource) {
                    if (changedCoords.x == coords.x && changedCoords.y == coords.y - 1 && changedCoords.z == coords.z) {
                        if (blockSource.getBlockId(coords.x, coords.y - 1, coords.z) != VanillaBlockID.farmland) {
                            blockSource.destroyBlock(coords.x, coords.y, coords.z, false);
                            blockSource.spawnDroppedItem(coords.x, coords.y, coords.z, this.getDrop(BlockIDarray[k]), 1, 0);
                        };
                    };
                });
            };
        };
    },
    registerSeed_base: function(nameID, name, textureName, stack) {
        IDRegistry.genItemID(nameID);
        Item.createItem(nameID, name, {
            name: textureName
        }, {
            isTech: false,
            stack: stack
        });
    },
    register: function(type, nameID, name, textureName, stack) {
        if (type == "normal") this.registerSeed_base(type, nameID, name, textureName, stack);
        if (!type || (type != "normal")) Logger.Log("Missing type !", "ERROR");
    }
};

EXPORT("FoodRegister", FoodRegister);
EXPORT("SeedRegister", SeedRegister);