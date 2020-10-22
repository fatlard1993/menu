import Log from 'log';
import dom from 'dom';

const menu = {
	log: new Log({ tag: 'menu' }),
	items: {},
	init: function(list = {}, opts = {}){
		menu.list = list;
		menu.opts = opts;

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
		if(!menu.list[menuName]) return menu.log.error()(`menu.list["${menuName}"] is not defined!`);

		if(menu.dontOpen) return delete menu.dontOpen;

		menu.isOpen = menuName;

		if(!menu.elem) menu.elem = document.getElementById('menu') || dom.createElem('ul', { id: 'menu', prependTo: document.body });

		menu.itemKeys = {};

		dom.animation.add('write', function menuDraw_anim(){
			menu.elem.className = 'discard '+ (menu.opts.discardDirection || 'static');

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
					li = dom.createElem('li', {
						appendTo: menu.elem,
						onPointerPress: menu.onPointerPress
					});

					menu.items[newMenuItemNames[x]] = li;
				}

				li.textContent = li.itemText = itemName;
				li.className = itemClass;

				if(itemClass.includes('default')) menu.hoveredItem = li;

				key = menu.generateMenuKey(itemName, li);

				if(key) li.setAttribute('data-key', key.toUpperCase());
			}

			dom.show(menu.elem, '', function(){
				menu.className = menuName;

				menu.elem.removeEventListener('scroll', menu.onScroll);

				if(menu.elem.scrollHeight > menu.elem.clientHeight) menu.elem.addEventListener('scroll', menu.onScroll);

				menu.triggerEvent('open', menu.isOpen);
			});
		});

		return menu;
	},
	close: function(force){
		if(menu.dontClose) return delete menu.dontClose;

		if(!menu.isOpen || (!force && menu.locked)) return;

		menu.elem.removeEventListener('scroll', menu.onScroll);

		dom.discard(menu.elem, menu.opts.discardDirection || 'static', () => {
			menu.isOpen = false;

			delete menu.oneTimeKeyboardHints;

			menu.triggerEvent('close', { forced: force });
		});
	},
	drawAtCursor: function(evt){
		var position = dom.resolvePosition(evt);

		dom.animation.add('write', function(){
			menu.elem.style.top = (position.y >= document.body.clientHeight - menu.elem.clientHeight ? position.y - menu.elem.clientHeight : position.y) +'px';
			menu.elem.style.left = (position.x >= document.body.clientWidth - menu.elem.clientWidth ? position.x - menu.elem.clientWidth : position.x) +'px';
			menu.elem.style.right = 'unset';
		});
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

		if(!menu.isScrolling) menu.triggerEvent('scrollStart', menu.isScrolling);

		menu.isScrolling = true;

		menu.scroll_TO = setTimeout(function(){
			menu.triggerEvent('scrollStop', menu.isScrolling);

			menu.isScrolling = false;
		}, 400);
	},
	onPointerPress: function(evt){
		if(menu.isScrolling) return;

		evt.preventDefault();

		menu.triggerEvent('selection', { item: evt.target.getAttribute('data-key') ? menu.itemKeys[evt.target.getAttribute('data-key')].itemText : evt.target.textContent, target: evt.target, originalEvent: evt });

		evt.target.blur();
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

			menu.close(1);
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

if(typeof module === 'object') module.exports = menu;