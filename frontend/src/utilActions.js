//https://svelte.dev/repl/f34b6159667247e6b6abb5142b276483?version=3.6.3
//https://stackoverflow.com/questions/56844807/svelte-long-press

//tried svelte-gestures (more robust) failed due to old webpack...

export function longpress(node, threshold = 500) {
	const handle_mousedown = () => {
		let start = Date.now();
		
		const timeout = setTimeout(() => {
			node.dispatchEvent(new CustomEvent('longpress'));
		}, threshold);
		
		const cancel = () => {
			clearTimeout(timeout);
			//node.removeEventListener('mousemove', cancel);
			node.removeEventListener('mouseup', cancel);
			node.removeEventListener('touchend', cancel);
		};
		
		//node.addEventListener('mousemove', cancel);
		node.addEventListener('mouseup', cancel);
        node.addEventListener('touchend', cancel);
	}
	
	node.addEventListener('mousedown', handle_mousedown);
	node.addEventListener('touchstart', handle_mousedown);
	
	return {
		destroy() {
			node.removeEventListener('mousedown', handle_mousedown);
			node.removeEventListener('touchstart', handle_mousedown);
		}
	};
}
