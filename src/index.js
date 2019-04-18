// includes dom log
// babel
/* global dom log */

var menu = {
	items: {},
	init: function(list = {}, opts = {}){
		menu.list = list;
		menu.opts = opts;

		dom.interact.on('pointerUp', menu.onPointerUp);
		dom.interact.on('keyDown', menu.onKeyDown);
		dom.interact.on('keyUp', menu.onKeyUp);

		menu.on('selection', menu.onSelection);
	},
	on: function(eventName, func){
		eventName = `on_${eventName}`;

		menu[eventName] = menu[eventName] || [];

		menu[eventName].push(func);
	},
	triggerEvent: function(type, evt){
		if(!evt){
			evt = type;
			type = evt.type;
		}

		var eventName = `on_${type}`;

		if(menu[eventName]) for(var x = 0, count = menu[eventName].length; x < count; ++x) menu[eventName][x].call(menu, evt);
	},
	open: function(menuName){
		if(!menu.list[menuName]) return log.error(`menu.list["${menuName}"] is not defined!`);

		menu.menuButton = menu.menuButton || document.getElementById('menuButton');

		menu.isOpen = menuName;

		if(menu.menuButton) menu.menuButton.classList.add('active');

		if(!menu.elem) menu.elem = document.getElementById('menu') || dom.createElem('ul', { id: 'menu', prependTo: document.body });

		menu.itemKeys = {};

		dom.animation.add('write', function menuDraw_anim(){
			menu.elem.className = 'discard '+ (menu.opts.discardDirection || 'right');

			var newMenuItemNames = Object.keys(menu.list[menuName]), newItemCount = menu.list[menuName].length;
			var oldMenuItemNames = Object.keys(menu.items), oldItemCount = oldMenuItemNames.length;
			var itemName, itemClass, li, key;

			for(var x = 0, count = Math.max(oldItemCount, newItemCount); x < count; ++x){
				itemName = menu.list[menuName][newMenuItemNames[x]];

				if(!itemName){
					if(oldMenuItemNames[x]){
						dom.remove(menu.items[oldMenuItemNames[x]]);

						delete menu.items[oldMenuItemNames[x]];
					}

					continue;
				}

				itemName = itemName.split(':~:');
				itemClass = itemName[1] || '';
				itemName = itemName[0];

				if(menu.items[newMenuItemNames[x]]) li = menu.items[newMenuItemNames[x]];

				else{
					li = dom.createElem('li', { appendTo: menu.elem });

					menu.items[newMenuItemNames[x]] = li;
				}

				li.textContent = li.itemText = itemName;
				li.className = itemClass;

				key = menu.generateMenuKey(itemName, li);

				li.setAttribute('data-key', key.toUpperCase());
			}

			dom.show(menu.elem, menuName, function(){
				menu.elem.removeEventListener('scroll', menu.onScroll);

				if(menu.elem.scrollHeight > menu.elem.clientHeight) menu.elem.addEventListener('scroll', menu.onScroll);

				menu.triggerEvent('open');
			});
		});
	},
	close: function(force){
		var forceFn = { force: function(){ menu.close(1); } };

		if(!menu.isOpen || (!force && menu.locked)) return forceFn;

		menu.elem.removeEventListener('scroll', menu.onScroll);

		dom.discard(menu.elem, menu.opts.discardDirection || 'right');

		menu.isOpen = false;

		delete menu.oneTimeKeyboardHints;

		if(menu.menuButton) menu.resetActive(menu.menuButton);

		menu.triggerEvent('close', { forced: force });

		return forceFn;
	},
	generateMenuKey: function(name, elem){
		for(var x = 0, count = name.length, key; x < count; ++x){
			key = name.charAt(x);

			if(!/[a-zA-Z0-9]/.test(key)) continue;

			var keyUpperCase = key.toUpperCase();

			if(!menu.itemKeys[keyUpperCase]){
				menu.itemKeys[keyUpperCase] = elem;

				if(menu.opts.showKeyboardHints || menu.oneTimeKeyboardHints) elem.textContent = elem.textContent.replace(new RegExp(key), `[${key}]`);

				return key;
			}
		}
	},
	resetActive: function(elem){
		setTimeout(function(){ elem.classList.remove('active', 'hovered'); }, 200);
	},
	toggleLock: function(){
		return (menu.locked = !menu.locked);
	},
	onSelection: function(evt){
		if(menu.list[evt.item.toLowerCase()]) menu.open(evt.item.toLowerCase());
	},
	onScroll: function(){
		if(menu.scroll_TO) clearTimeout(menu.scroll_TO);

		if(!menu.isScrolling) menu.triggerEvent('scrollStart');

		menu.isScrolling = true;

		menu.scroll_TO = setTimeout(function(){
			menu.triggerEvent('scrollStop');

			menu.isScrolling = false;
		}, 400);
	},
	onPointerUp: function(evt){
		if(evt.target.id === 'menuButton'){
			evt.preventDefault();

			if(menu.isOpen) menu.close();

			else menu.open('main');
		}

		else if(!menu.isScrolling && evt.target.parentElement === menu.elem){
			evt.preventDefault();

			menu.triggerEvent('selection', { item: menu.itemKeys[evt.target.getAttribute('data-key')].itemText, target: evt.target });

			evt.target.blur();
		}
	},
	onKeyDown: function(evt){
		if(!menu.isOpen || menu.locked || !Object.assign(menu.itemKeys, { ENTER: 1 })[evt.keyPressed] || (document.activeElement && { INPUT: 1, TEXTAREA: 1 }[document.activeElement.tagName])) return;

		evt.preventDefault();

		menu.activeItem = menu.hoveredItem && evt.keyPressed === 'ENTER' ? menu.hoveredItem : (menu.itemKeys[evt.keyPressed] ? menu.itemKeys[evt.keyPressed] : null);

		if(!menu.activeItem) return;

		if(menu.hoveredItem) delete menu.hoveredItem;

		dom.animation.add('write', function(){
			menu.activeItem.classList.add('active');
		});
	},
	onKeyUp: function(evt){
		if((document.activeElement && { INPUT: 1, TEXTAREA: 1 }[document.activeElement.tagName]) || menu.locked) return;

		if(evt.keyPressed === 'M'){
			evt.preventDefault();

			menu.oneTimeKeyboardHints = true;

			menu.open('main');
		}

		else if(!menu.isOpen) return;

		if(evt.keyPressed === 'ESCAPE'){
			evt.preventDefault();

			menu.close().force();
		}

		else if(menu.activeItem){
			evt.preventDefault();

			menu.triggerEvent('selection', { item: menu.activeItem.itemText, target: menu.activeItem });

			menu.resetActive(menu.activeItem);

			delete menu.activeItem;
		}

		else if(evt.keyPressed === 'UP' || evt.keyPressed === 'DOWN'){
			evt.preventDefault();

			dom.animation.add('write', function(){
				if(!menu.hoveredItem) menu.hoveredItem = menu.elem.children[evt.keyPressed === 'UP' ? menu.elem.children.length - 1 : 0];

				else {
					menu.hoveredItem.classList.remove('hovered');

					menu.hoveredItem = menu.hoveredItem[`${evt.keyPressed === 'UP' ? 'previous' : 'next'}Sibling`];
				}

				menu.hoveredItem.classList.add('hovered');
			});
		}
	}
};