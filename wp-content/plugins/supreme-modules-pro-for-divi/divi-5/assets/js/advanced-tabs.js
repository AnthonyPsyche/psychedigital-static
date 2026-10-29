/**
 * Class representing an advanced tabbed interface with support for fully independent nested tabs.
 */
class AdvancedTabs {
	/**
	 * Create a tabbed interface.
	 * @param {HTMLElement} container - The container element for the tabs.
	 */
	constructor( container ) {
		this.container = container;
		this.tabs = container.querySelectorAll(
			':scope > .dsm-advanced-tabs-wrapper > .dsm-tab'
		);
		this.tabsContent = container.querySelectorAll(
			':scope > .dsm-advanced-tabs-content-wrapper > .dsm-content-wrapper'
		);
		this.trigger = container.dataset.trigger;
		this.animationName = container.dataset.animation;
		this.innerAnimationName = container.dataset.inner_animation;
		this.deepLink = container.dataset.deep_link === 'on';
		this.autoScrollMobile = container.dataset.auto_scroll_mobile === 'on';
		this.anchorLink = container.dataset.anchor_link === 'on';
		// Panels Divi could not animate on load because they were hidden.
		this.panelsHiddenAtInit = new Set();
		this.tabsContent.forEach( ( panel ) => {
			if ( panel.hasAttribute( 'hidden' ) ) {
				this.panelsHiddenAtInit.add( panel );
			}
		} );

		this.init();
	}

	/**
	 * Initialize the tabbed interface.
	 */
	init() {
		this.setupEventListeners();
		this.handleInitialState();
	}

	/**
	 * Set up event listeners for the tabs.
	 */
	setupEventListeners() {
		this.tabs.forEach( ( tab ) => {
			if ( this.trigger === 'click' ) {
				tab.addEventListener( 'click', ( e ) =>
					this.handleEvent( e, tab )
				);
			} else if ( this.trigger === 'hover' ) {
				tab.addEventListener( 'mouseover', ( e ) =>
					this.handleEvent( e, tab )
				);
			}
			tab.addEventListener( 'keydown', ( event ) => {
				if ( event.key === 'Enter' || event.key === ' ' ) {
					event.preventDefault();
					this.handleEvent( event, tab );
					return;
				}
				this.handleTabKeydown( event, tab );
			} );
		} );
	}

	/**
	 * Arrow / Home / End keyboard navigation (WAI-ARIA tabs pattern).
	 *
	 * @param {KeyboardEvent} event
	 * @param {HTMLElement} tab
	 */
	handleTabKeydown( event, tab ) {
		const keys = [
			'ArrowLeft',
			'ArrowRight',
			'ArrowUp',
			'ArrowDown',
			'Home',
			'End',
		];
		if ( ! keys.includes( event.key ) ) {
			return;
		}

		const vertical =
			this.container.classList.contains( 'dsm-tabs-vertical' ) ||
			this.container.classList.contains( 'dsm-tabs-column' );

		const tabList = Array.from( this.tabs );
		const idx = tabList.indexOf( tab );
		if ( idx < 0 ) {
			return;
		}

		let nextIdx = idx;

		if ( event.key === 'Home' ) {
			nextIdx = 0;
		} else if ( event.key === 'End' ) {
			nextIdx = tabList.length - 1;
		} else if ( vertical ) {
			if ( event.key === 'ArrowUp' ) {
				nextIdx = ( idx - 1 + tabList.length ) % tabList.length;
			} else if ( event.key === 'ArrowDown' ) {
				nextIdx = ( idx + 1 ) % tabList.length;
			} else {
				return;
			}
		} else {
			if ( event.key === 'ArrowLeft' ) {
				nextIdx = ( idx - 1 + tabList.length ) % tabList.length;
			} else if ( event.key === 'ArrowRight' ) {
				nextIdx = ( idx + 1 ) % tabList.length;
			} else {
				return;
			}
		}

		event.preventDefault();
		const nextTab = tabList[ nextIdx ];
		if ( nextTab ) {
			nextTab.focus();
			this.setActiveTab( nextTab );
		}
	}

	/**
	 * Safe string for data-tabid / data-contentid (avoids .trim on undefined).
	 *
	 * @param {HTMLElement} el
	 * @param {string} key - dataset key, e.g. 'tabid' or 'contentid' (matches data-tabid / data-contentid)
	 * @returns {string}
	 */
	static getDatasetTrimmed( el, key ) {
		if ( ! el ) {
			return '';
		}
		let v = el.dataset?.[ key ];
		if ( typeof v !== 'string' || v === '' ) {
			v = el.getAttribute( `data-${ key }` );
		}
		return typeof v === 'string' ? v.trim() : '';
	}

	/**
	 * Handle the initial state of the tabs.
	 */
	handleInitialState() {
		if ( ! this.tabs.length ) {
			return;
		}

		let activeTab = this.tabs[ 0 ]; // Default to first tab

		// Agar hash majood hai, uske mutabiq tab dhond lein
		if ( this.deepLink && location.hash ) {
			const hash = location.hash.substring( 1 );
			const matchingTab = Array.from( this.tabs ).find( ( tab ) => {
				const tabTitle = tab.querySelector( '.dsm-title' );
				return (
					tabTitle &&
					tabTitle.textContent
						.toLowerCase()
						.replace( /\s+/g, '-' ) === hash
				);
			} );
			if ( matchingTab ) {
				activeTab = matchingTab;
			}
		}

		// CHANGED: Pass "false" so that we do NOT pushState on page load
		this.setActiveTab( activeTab, false );

		this.anchorInitScroll();

		// Agar hash hai (yaani user ne #kuchHash ke sath page open kiya),
		// to scroll karein. Agar hash nahin, to skip.
		if ( this.deepLink && location.hash && activeTab ) {
			const tabId = AdvancedTabs.getDatasetTrimmed( activeTab, 'tabid' );
			const content = Array.from( this.tabsContent ).find(
				( panel ) =>
					AdvancedTabs.getDatasetTrimmed( panel, 'contentid' ) ===
					tabId
			);

			if ( content ) {
				setTimeout( () => {
					content.scrollIntoView( {
						behavior: 'smooth',
						block: 'start',
						inline: 'center',
					} );
				}, 300 ); // Adjust timeout as needed
			}
		}
	}

	/**
	 * Handle tab events (click or hover).
	 * @param {Event} event - The event object.
	 * @param {HTMLElement} tab - The tab element.
	 */
	handleEvent( event, tab ) {
		event.stopPropagation();
		// CHANGED: On click, let it push the state (default = true)
		this.setActiveTab( tab );
		this.autoScrollOnMobile( tab );
	}

	/**
	 * Set the active tab.
	 * @param {HTMLElement} activeTab - The tab to set as active.
	 * @param {boolean} [shouldPushState=true] - Whether or not to push hash to URL. (CHANGED)
	 */
	setActiveTab( activeTab, shouldPushState = true ) {
		if ( ! activeTab ) {
			return;
		}

		const tabId = AdvancedTabs.getDatasetTrimmed( activeTab, 'tabid' );
		if ( ! tabId ) {
			console.warn(
				'AdvancedTabs: tab is missing data-tabid; cannot sync content panel.'
			);
			return;
		}

		const content = Array.from( this.tabsContent ).find(
			( panel ) =>
				AdvancedTabs.getDatasetTrimmed( panel, 'contentid' ) === tabId
		);

		if ( ! content ) {
			console.error(
				`No matching content found for tab with id: ${ tabId }`
			);
			return;
		}

		// Remove active class from all tabs and content
		this.tabs.forEach( ( tab ) =>
			tab.classList.remove( 'dsm-active', this.animationName )
		);
		this.tabsContent.forEach( ( content ) => {
			content.classList.remove( 'dsm-active', this.animationName );
			const inner = content.querySelector( '.dsm-inner-content-wrapper' );
			if ( inner ) {
				inner.classList.remove( 'animated', this.innerAnimationName );
			}
		} );

		// Add active class to selected tab and content
		activeTab.classList.add( 'dsm-active' );
		content.classList.add( 'dsm-active', this.animationName );
		const innerContent = content.querySelector(
			'.dsm-inner-content-wrapper'
		);
		if ( innerContent ) {
			innerContent.classList.add( 'animated', this.innerAnimationName );
		}

		this.syncTabAccessibility( activeTab );

		// Handle deep linking, but ONLY if shouldPushState == true
		if ( this.deepLink && shouldPushState ) {
			const tabTitle = activeTab.querySelector( '.dsm-title' );
			if ( tabTitle ) {
				const hash = tabTitle.textContent
					.toLowerCase()
					.replace( /\s+/g, '-' );
				history.pushState( null, null, `#${ hash }` );
				this.container.classList.add( 'dsm-active-deep-link' );
			}
		}

		// Notify layout modules (Masonry, etc.) after the panel is measurable.
		this.dispatchContentRevealed( content );
	}

	/**
	 * Fire `dsm:content-revealed` for the active panel (double rAF for paint).
	 *
	 * @param {HTMLElement} content Active `.dsm-content-wrapper`.
	 */
	dispatchContentRevealed( content ) {
		if ( typeof window === 'undefined' || ! content ) {
			return;
		}

		const fire = () => {
			this.replayDiviScrollAnimations( content );
			window.dispatchEvent(
				new CustomEvent( 'dsm:content-revealed', {
					bubbles: true,
					detail: { root: content },
				} )
			);
		};

		window.requestAnimationFrame( () => {
			window.requestAnimationFrame( fire );
		} );
	}

	/**
	 * Play Divi scroll animations inside a panel that was hidden on load.
	 *
	 * Divi's waypoint runs once. It skips nodes that are not visible, and it
	 * does not run again when the tab opens. In-view modules play now. Modules
	 * still below the fold play when they scroll into view.
	 *
	 * @param {HTMLElement} panel Active `.dsm-content-wrapper`.
	 */
	replayDiviScrollAnimations( panel ) {
		if (
			! this.panelsHiddenAtInit ||
			! this.panelsHiddenAtInit.has( panel ) ||
			typeof window.et_animate_element !== 'function' ||
			typeof window.jQuery !== 'function'
		) {
			return;
		}

		const $ = window.jQuery;
		panel.querySelectorAll( '.et_animated' ).forEach( ( el ) => {
			if ( ! ( el instanceof HTMLElement ) || ! this.needsDiviScrollAnimation( el ) ) {
				return;
			}

			const $el = $( el );
			if ( $el.is( ':visible' ) && this.elementIntersectsViewport( el ) ) {
				window.et_animate_element( $el );
				return;
			}

			this.observeDiviScrollAnimation( el );
		} );
	}

	/**
	 * Whether this node still has a Divi scroll animation that has not started.
	 *
	 * @param {HTMLElement} el
	 * @returns {boolean}
	 */
	needsDiviScrollAnimation( el ) {
		if ( el.classList.contains( 'et_had_animation' ) ) {
			return false;
		}

		const style = el.getAttribute( 'data-animation-style' );
		if ( ! style || style === 'none' || el.classList.contains( style ) ) {
			return false;
		}

		return true;
	}

	/**
	 * @param {HTMLElement} el
	 * @returns {boolean}
	 */
	elementIntersectsViewport( el ) {
		const rect = el.getBoundingClientRect();
		const height = window.innerHeight || document.documentElement.clientHeight;
		const width = window.innerWidth || document.documentElement.clientWidth;

		return (
			rect.width > 0 &&
			rect.height > 0 &&
			rect.bottom > 0 &&
			rect.right > 0 &&
			rect.top < height &&
			rect.left < width
		);
	}

	/**
	 * Replace a waypoint that already fired while this node was hidden.
	 *
	 * @param {HTMLElement} el
	 */
	observeDiviScrollAnimation( el ) {
		if ( typeof IntersectionObserver !== 'function' ) {
			if ( window.jQuery( el ).is( ':visible' ) ) {
				window.et_animate_element( window.jQuery( el ) );
			}
			return;
		}

		if ( ! this.diviAnimationObserver ) {
			this.diviAnimationObserver = new IntersectionObserver( ( entries ) => {
				entries.forEach( ( entry ) => {
					if ( ! entry.isIntersecting || ! ( entry.target instanceof HTMLElement ) ) {
						return;
					}

					const target = entry.target;
					if (
						typeof window.jQuery !== 'function' ||
						! window.jQuery( target ).is( ':visible' ) ||
						! this.needsDiviScrollAnimation( target )
					) {
						return;
					}

					this.diviAnimationObserver.unobserve( target );
					window.et_animate_element( window.jQuery( target ) );
				} );
			} );
		}

		this.diviAnimationObserver.observe( el );
	}

	/**
	 * Update aria-selected, tabindex (roving), and panel hidden for the active tab.
	 *
	 * @param {HTMLElement} activeTab
	 */
	syncTabAccessibility( activeTab ) {
		this.tabs.forEach( ( tab ) => {
			const selected = tab === activeTab;
			tab.setAttribute( 'aria-selected', selected ? 'true' : 'false' );
			tab.setAttribute( 'tabindex', selected ? '0' : '-1' );
		} );

		const tabId = AdvancedTabs.getDatasetTrimmed( activeTab, 'tabid' );
		this.tabsContent.forEach( ( panel ) => {
			const pid = AdvancedTabs.getDatasetTrimmed( panel, 'contentid' );
			if ( pid === tabId ) {
				panel.removeAttribute( 'hidden' );
			} else {
				panel.setAttribute( 'hidden', '' );
			}
		} );
	}

	/**
	 * Handle auto scroll on mobile.
	 * @param {HTMLElement} activeTab - The active tab element.
	 */
	autoScrollOnMobile( activeTab ) {
		if ( ! activeTab ) {
			return;
		}

		const tabId = AdvancedTabs.getDatasetTrimmed( activeTab, 'tabid' );
		const content = Array.from( this.tabsContent ).find(
			( panel ) =>
				AdvancedTabs.getDatasetTrimmed( panel, 'contentid' ) === tabId
		);

		// Handle auto scroll on mobile
		if (
			this.autoScrollMobile &&
			window.innerWidth <= 768 &&
			content
		) {
			content.scrollIntoView( {
				behavior: 'smooth',
				block: 'start',
				inline: 'nearest',
			} );
		}
	}

	/**
	 * Scroll to the target element smoothly.
	 * @param {HTMLElement} target - The target element to scroll to.
	 */
	anchorSmoothScroll( target ) {
		// Check if anchor linking is enabled
		if ( ! this.anchorLink ) {
			return;
		}

		target.scrollIntoView( {
			behavior: 'smooth',
			block: 'start',
		} );
	}

	/**
	 * Find the matching tab by hash.
	 * @param {string} hash - The hash to find the matching tab by.
	 * @returns {HTMLElement|null} The matching tab or null if no match is found.
	 */
	findMatchingTab( hash ) {
		if ( ! hash ) return null;

		// First try to find tab by matching title
		const matchingTab = Array.from( this.tabs ).find( ( tab ) => {
			const tabTitle = tab.querySelector( '.dsm-title' );
			return (
				tabTitle &&
				tabTitle.textContent.toLowerCase().replace( /\s+/g, '-' ) ===
					hash
			);
		} );

		if ( matchingTab ) {
			this.setActiveTab( matchingTab );
			return matchingTab;
		}

		// If no match by title, try matching by class
		const matchingTabByClass = Array.from( this.tabs ).find( ( tab ) =>
			tab.classList.contains( hash )
		);

		if ( matchingTabByClass ) {
			this.setActiveTab( matchingTabByClass );
			return matchingTabByClass;
		}

		return null;
	}

	/**
	 * Initialize anchor linking.
	 */
	anchorInitScroll() {
		const links = document.querySelectorAll( 'a' );

		links.forEach( ( link ) => {
			const href = link.getAttribute( 'href' );

			if ( href?.startsWith( '#' ) && href.length > 1 ) {
				link.addEventListener( 'click', ( e ) => {
					const targetId = href.slice( 1 );
					const matchingTab = this.findMatchingTab( targetId );

					if ( matchingTab ) {
						e.preventDefault(); // Only prevent default if we found a matching tab
						this.anchorSmoothScroll( matchingTab );
					}
				} );
			}
		} );
	}
}

// Initialize tabs when the DOM is fully loaded
window.addEventListener( 'load', () => {
	const initTabs = ( container ) => {
		new AdvancedTabs( container );

		// Initialize nested tabs
		const nestedContainers = container.querySelectorAll(
			':scope .dsm-content-wrapper .dsm-advanced-tabs-container'
		);
		nestedContainers.forEach( ( nestedContainer ) => {
			initTabs( nestedContainer );
		} );
	};

	const topLevelContainers = document.querySelectorAll(
		'.dsm-advanced-tabs-container:not(.dsm-content-wrapper .dsm-advanced-tabs-container)'
	);
	topLevelContainers.forEach( ( container ) => {
		initTabs( container );
	} );
} );
