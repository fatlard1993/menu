// includes dom log
// babel
/* global dom log */

var menu = {
	list: {},
	init: function(){
		dom.interact.on('pointerUp', menu.onPointerUp);
		dom.interact.on('keyDown', menu.onKeyDown);
		dom.interact.on('keyUp', menu.onKeyUp);
	},
	open: function(menuName, cb){
		if(!menu.list[menuName]) return log.error('menu.list["'+ menuName +'"] is not defined!');

		menu.menuButton = menu.menuButton || document.getElementById('MenuButton');

		menu.isOpen = menuName;

		if(menu.menuButton) menu.menuButton.className = 'active';

		if(!menu.active) menu.active = document.getElementById('menu') || dom.createElem('ul', { id: 'menu', prependTo: document.body});

		dom.empty(menu.active); //todo re-use list items
		menu.items = [];
		menu.itemKeys = {};

		dom.animation.add('write', function menuDraw_anim(){
			menu.active.className = 'discard right';

			var itemCount = menu.list[menuName].length, item, itemOpts, li, x;

			for(x = 0; x < itemCount; ++x){
				item = menu.list[menuName][x];

				if(!item || item === '') continue;

				itemOpts = item.split(':~:');
				li = dom.createElem('li', { className: 'menuItem '+ (itemOpts[1] ? itemOpts[1] : ''), textContent: itemOpts[0] });

				menu.active.appendChild(li);
				menu.items.push(li);
				menu.itemKeys[itemOpts[0].slice(0, 1)] = x;
			}

			dom.show(menu.active, menuName, function(){
				if(menu.active.scrollHeight > menu.active.clientHeight){
					menu.active.removeEventListener('scroll', menu.onScroll);
					menu.active.addEventListener('scroll', menu.onScroll);
				}

				if(cb) cb();
			});
		});
	},
	close: function(force){
		if(menu.isOpen){
			if(!force){
				var lockMenuItem = menu.active.getElementsByClassName('lock')[0];

				if((lockMenuItem && lockMenuItem.className.includes('locked'))) return;
			}

			menu.active.removeEventListener('scroll', menu.onScroll);

			dom.discard(menu.active, 'right');

			menu.isOpen = false;

			if(menu.menuButton) menu.menuButton.className = '';
		}
	},
	onScroll: function(){
		if(menu.scroll_TO) clearTimeout(menu.scroll_TO);

		menu.isScrolling = true;

		menu.scroll_TO = setTimeout(function(){
			menu.isScrolling = false;
		}, 400);
	},
	onPointerUp: function(evt){
		if(evt.target.id === 'MenuButton'){
			evt.preventDefault();
			dom.interact.pointerTarget = null;

			if(menu.isOpen) menu.close();

			else menu.open('main');
		}

		else if(menu.isOpen && !menu.isScrolling){
			if(evt.target.className.includes('menuItem')){
				evt.preventDefault();
				dom.interact.pointerTarget = null;

				menu.handleSelection(menu.active.className, evt.target.textContent, evt.target);
			}

			else menu.close();
		}
	},
	onKeyDown: function(evt, keyPressed){
		if((document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) || menu.locked) return;

		var target;

		if(menu.isOpen){
			if(keyPressed === 'ENTER'){
				target = menu.active.getElementsByClassName('hovered')[0];

				if(!target) return;

				evt.preventDefault();

				dom.animation.add('write', function(){
					target.className += ' active';
				});
			}

			else if(typeof menu.itemKeys[keyPressed] !== 'undefined'){
				target = menu.items[menu.itemKeys[keyPressed]];

				if(!target) return;

				evt.preventDefault();

				dom.animation.add('write', function(){
					target.className += ' active';
				});
			}
		}
	},
	onKeyUp: function(evt, keyPressed){
		if((document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) || menu.locked) return;

		var target;

		if(keyPressed === 'M'){
			evt.preventDefault();

			if(menu.isOpen) menu.close();

			else menu.open('main');
		}

		else if(menu.isOpen){
			if(keyPressed === 'UP' || keyPressed === 'DOWN'){
				evt.preventDefault();

				var hoveredItem = menu.active.getElementsByClassName('hovered')[0];

				dom.animation.add('write', function(){
					if(hoveredItem){
						hoveredItem.className = hoveredItem.className.replace(/\shovered/g, '');

						var nextToHover = hoveredItem[(keyPressed === 'UP' ? 'previousSibling' : 'nextSibling')];

						if(nextToHover) nextToHover.className += ' hovered';
					}

					else{
						menu.active.children[keyPressed === 'UP' ? menu.active.children.length - 1 : 0].className += ' hovered';
					}
				});
			}

			else if(keyPressed === 'ENTER'){
				target = menu.active.getElementsByClassName('active')[0];

				if(!target) return;

				evt.preventDefault();

				menu.handleSelection(menu.active.className, target.textContent, target);

				setTimeout(function(){ target.className = target.className.replace(/active|hovered/g, ''); }, 200);
			}

			else if(menu.isOpen && typeof menu.itemKeys[keyPressed] !== 'undefined'){
				target = menu.items[menu.itemKeys[keyPressed]];

				if(!target) return;

				evt.preventDefault();

				menu.handleSelection(menu.active.className, target.textContent, target);

				setTimeout(function(){ target.className = target.className.replace(/active|hovered/g, ''); }, 200);
			}
		}
	},
	handleSelection: function(menuClass, selectedItem, target){
		if(selectedItem === 'Lock'){
			dom.animation.add('write', function(){
				target.className = 'menuItem lock'+ (target.className.includes('locked') ? '' : ' locked');
			});
		}

		else menu.close();
	}
};