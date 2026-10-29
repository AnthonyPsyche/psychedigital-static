/**
 * Shared Post / Blog carousel frontend init + library-preview re-init.
 *
 * @package DiviSupreme
 */
( function ( window, factory ) {
	'use strict';

	if ( typeof window.jQuery === 'undefined' ) {
		return;
	}

	window.dsmRegisterPostBlogCarouselModule = factory( window.jQuery );
} )( window, function ( $ ) {
	'use strict';

	/**
	 * @param {object} config
	 * @param {string} config.rootSelector
	 * @param {string} config.carouselRootSelector
	 * @param {string} config.containerSelector
	 * @param {string} config.slideClass
	 * @param {string} config.wrapperClass
	 * @param {string} config.reinitGlobalName
	 */
	return function registerPostBlogCarouselModule( config ) {
		var DSM_PC_LOOP_MIN_CLONE_CLASS =
			'dsm-post-blog-carousel-loop-minimum-clone';

		/**
		 * @param {number}  slidesPerView
		 * @param {number}  slidesPerGroup
		 * @param {boolean} centeredSlides
		 * @return {number}
		 */
		function getLoopMinimumSlideCount(
			slidesPerView,
			slidesPerGroup,
			centeredSlides
		) {
			var spv = Math.max( 1, Number( slidesPerView ) || 1 );
			var spg = Math.max( 1, Number( slidesPerGroup ) || 1 );

			return spv + spg + ( centeredSlides ? 1 : 0 );
		}

		/**
		 * @param {number}  slideCount
		 * @param {number}  slidesPerView
		 * @param {number}  slidesPerGroup
		 * @param {boolean} centeredSlides
		 * @return {number}
		 */
		function getLoopTargetSlideCount(
			slideCount,
			slidesPerView,
			slidesPerGroup,
			centeredSlides
		) {
			var group = Math.max( 1, Number( slidesPerGroup ) || 1 );
			var count = Math.max( 0, Number( slideCount ) || 0 );
			var target = Math.max(
				count,
				getLoopMinimumSlideCount(
					slidesPerView,
					group,
					centeredSlides
				)
			);
			var remainder = target % group;

			if ( 0 !== remainder ) {
				target += group - remainder;
			}

			return target;
		}

		/**
		 * @param {Element} wrapper
		 * @return {void}
		 */
		function removeLoopMinimumClones( wrapper ) {
			if ( ! wrapper || typeof wrapper.querySelectorAll !== 'function' ) {
				return;
			}

			wrapper
				.querySelectorAll(
					'.' +
						DSM_PC_LOOP_MIN_CLONE_CLASS +
						', .swiper-slide-blank'
				)
				.forEach( function ( node ) {
					if ( node.parentNode ) {
						node.parentNode.removeChild( node );
					}
				} );
		}

		/**
		 * Pad real slides so Swiper 12 loop does not insert `.swiper-slide-blank`.
		 *
		 * @param {Element} container
		 * @param {{ loop?: boolean, slidesPerView?: number, slidesPerGroup?: number, centeredSlides?: boolean }} options
		 * @return {void}
		 */
		function ensureLoopMinimumSlides( container, options ) {
			if ( ! container || ! options || ! options.loop ) {
				return;
			}

			var wrapper =
				container.querySelector( '.' + config.wrapperClass ) ||
				container.querySelector( '.swiper-wrapper' );

			if ( ! wrapper ) {
				return;
			}

			removeLoopMinimumClones( wrapper );

			var realSlides = Array.prototype.filter.call(
				wrapper.children,
				function ( slide ) {
					return (
						slide.nodeType === 1 &&
						! slide.classList.contains( 'swiper-slide-duplicate' ) &&
						! slide.classList.contains( 'swiper-slide-blank' ) &&
						! slide.classList.contains( DSM_PC_LOOP_MIN_CLONE_CLASS )
					);
				}
			);
			var slideCount = realSlides.length;

			if ( slideCount === 0 ) {
				return;
			}

			var group = Math.max( 1, Number( options.slidesPerGroup ) || 1 );
			var target = getLoopTargetSlideCount(
				slideCount,
				options.slidesPerView,
				group,
				!! options.centeredSlides
			);

			if ( slideCount >= target && 0 === slideCount % group ) {
				return;
			}

			var totalSlides = slideCount;
			var maxSlides = target + slideCount * group;

			while (
				( totalSlides < target || 0 !== totalSlides % group ) &&
				totalSlides < maxSlides
			) {
				for ( var i = 0; i < slideCount; i++ ) {
					var source = realSlides[ i ];
					if ( ! source ) {
						continue;
					}

					var clone = source.cloneNode( true );
					[
						'swiper-slide-active',
						'swiper-slide-next',
						'swiper-slide-prev',
						'swiper-slide-fully-visible',
						'swiper-slide-visible',
					].forEach( function ( cls ) {
						clone.classList.remove( cls );
					} );
					clone.removeAttribute( 'data-swiper-slide-index' );
					clone.classList.add( DSM_PC_LOOP_MIN_CLONE_CLASS );
					clone.setAttribute( 'aria-hidden', 'true' );
					wrapper.appendChild( clone );
					totalSlides += 1;
				}
			}
		}

		function startAutoplay( swiper ) {
			if (
				swiper &&
				swiper.autoplay &&
				typeof swiper.autoplay.start === 'function'
			) {
				swiper.autoplay.start();
			}
		}

		function stopAutoplay( swiper ) {
			if (
				swiper &&
				swiper.autoplay &&
				typeof swiper.autoplay.stop === 'function'
			) {
				swiper.autoplay.stop();
			}
		}

		function destroyAutoplayObservers( item ) {
			if (
				item._dsmAutoplayWaypoint &&
				typeof item._dsmAutoplayWaypoint.destroy === 'function'
			) {
				item._dsmAutoplayWaypoint.destroy();
			}
			item._dsmAutoplayWaypoint = null;

			if ( item._dsmAutoplayObserver ) {
				item._dsmAutoplayObserver.disconnect();
			}
			item._dsmAutoplayObserver = null;
		}

		/**
		 * @param {Element} el
		 * @param {string|undefined} offset
		 * @param {function(): void} startFn
		 */
		function bindViewportAutoplay( el, offset, startFn ) {
			var resolvedOffset =
				offset && String( offset ).trim() !== ''
					? String( offset )
					: '50%';
			var Wp = typeof window.Waypoint !== 'undefined' ? window.Waypoint : undefined;

			if ( typeof Wp !== 'undefined' ) {
				el._dsmAutoplayWaypoint = new Wp( {
					element: el,
					handler: function () {
						startFn();
						this.destroy();
						el._dsmAutoplayWaypoint = null;
					},
					offset: resolvedOffset,
				} );
				return;
			}

			if ( typeof IntersectionObserver !== 'undefined' ) {
				var rootMargin = '0px 0px -15% 0px';
				var m = resolvedOffset.match( /^(\d+)%$/ );
				if ( m ) {
					var p = Math.max(
						0,
						Math.min( 100, parseInt( m[ 1 ], 10 ) )
					);
					rootMargin = '0px 0px -' + ( 100 - p ) + '% 0px';
				}
				el._dsmAutoplayObserver = new IntersectionObserver(
					function ( entries, observer ) {
						entries.forEach( function ( entry ) {
							if ( entry.isIntersecting ) {
								startFn();
								observer.disconnect();
								el._dsmAutoplayObserver = null;
							}
						} );
					},
					{ root: null, rootMargin: rootMargin, threshold: 0 }
				);
				el._dsmAutoplayObserver.observe( el );
				return;
			}

			startFn();
		}

		/**
		 * Divi coarse breakpoints (matches Swiper 768 / 981 in this file).
		 *
		 * @param {number} [width]
		 * @return {'phone'|'tablet'|'desktop'}
		 */
		function getViewportBreakpoint( width ) {
			var w = typeof width === 'number' ? width : window.innerWidth;
			if ( w < 768 ) {
				return 'phone';
			}
			if ( w < 981 ) {
				return 'tablet';
			}
			return 'desktop';
		}

		/**
		 * @param {Element|null} carouselEl
		 * @param {'desktop'|'tablet'|'phone'} breakpoint
		 * @return {'horizontal'|'vertical'}
		 */
		function readOrientation( carouselEl, breakpoint ) {
			if ( ! carouselEl ) {
				return 'horizontal';
			}

			function rawFor( name ) {
				var value = carouselEl.getAttribute( name );
				if ( 'vertical' === value || 'horizontal' === value ) {
					return value;
				}
				return '';
			}

			if ( 'phone' === breakpoint ) {
				return (
					rawFor( 'data-orientation-phone' ) ||
					rawFor( 'data-orientation-tablet' ) ||
					rawFor( 'data-orientation' ) ||
					'horizontal'
				);
			}
			if ( 'tablet' === breakpoint ) {
				return (
					rawFor( 'data-orientation-tablet' ) ||
					rawFor( 'data-orientation' ) ||
					'horizontal'
				);
			}
			return rawFor( 'data-orientation' ) || 'horizontal';
		}

		/**
		 * Stored VB height (Blog Carousel only — requires `data-vertical-height`).
		 *
		 * @param {Element|null} carouselEl
		 * @param {'desktop'|'tablet'|'phone'} breakpoint
		 * @return {string}
		 */
		function readVerticalHeight( carouselEl, breakpoint ) {
			if ( ! carouselEl || ! carouselEl.hasAttribute( 'data-vertical-height' ) ) {
				return '';
			}

			var desktop = carouselEl.getAttribute( 'data-vertical-height' ) || '';
			if ( 'phone' === breakpoint ) {
				return (
					carouselEl.getAttribute( 'data-vertical-height-phone' ) ||
					carouselEl.getAttribute( 'data-vertical-height-tablet' ) ||
					desktop
				);
			}
			if ( 'tablet' === breakpoint ) {
				return (
					carouselEl.getAttribute( 'data-vertical-height-tablet' ) ||
					desktop
				);
			}
			return desktop;
		}

		/**
		 * @param {unknown} raw
		 * @param {number}  emptyFallback
		 * @return {number}
		 */
		function readSlidesPerViewInt( raw, emptyFallback ) {
			if ( raw === undefined || raw === null || raw === '' ) {
				return Math.max( 1, emptyFallback );
			}
			var n = parseInt( String( raw ), 10 );
			return ! isNaN( n ) && n >= 1 ? n : Math.max( 1, emptyFallback );
		}

		/**
		 * @param {unknown} raw
		 * @return {string}
		 */
		function spacingToCssLength( raw ) {
			if ( raw === undefined || raw === null || raw === '' ) {
				return '0px';
			}
			var s = String( raw ).trim();
			if ( '' === s ) {
				return '0px';
			}
			if ( /^[-+]?\d*\.?\d+$/.test( s ) ) {
				return s + 'px';
			}
			return s;
		}

		/**
		 * @param {unknown} raw
		 * @param {number}  fallback Use `NaN` when empty should not inherit here.
		 * @return {number}
		 */
		function parseSpaceBetween( raw, fallback ) {
			if ( raw === undefined || raw === null || raw === '' ) {
				return fallback;
			}
			var parsed = parseFloat( String( raw ) );
			return Number.isFinite( parsed ) ? parsed : fallback;
		}

		/**
		 * D4/VB: omitted tablet/phone inherit desktop. Default 30.
		 *
		 * @param {Object|null|undefined} data jQuery `.data()` from the carousel root.
		 * @param {'desktop'|'tablet'|'phone'} breakpoint
		 * @return {number}
		 */
		function readSpaceBetweenFromData( data, breakpoint ) {
			var desktop = parseSpaceBetween( data ? data.spacing : '', 30 );
			var tablet = parseSpaceBetween(
				data ? data.spacingtablet : '',
				NaN
			);
			var phone = parseSpaceBetween( data ? data.spacingphone : '', NaN );

			if ( 'phone' === breakpoint ) {
				if ( Number.isFinite( phone ) ) {
					return phone;
				}
				if ( Number.isFinite( tablet ) ) {
					return tablet;
				}
				return desktop;
			}

			if ( 'tablet' === breakpoint ) {
				return Number.isFinite( tablet ) ? tablet : desktop;
			}

			return desktop;
		}

		/**
		 * @param {Element|null} carouselEl
		 * @param {'desktop'|'tablet'|'phone'} breakpoint
		 * @return {number}
		 */
		function readVerticalSlidesPerView( carouselEl, breakpoint ) {
			if ( ! carouselEl ) {
				return 1;
			}
			if ( 'phone' === breakpoint ) {
				return readSlidesPerViewInt(
					carouselEl.getAttribute( 'data-columnsphone' ),
					1
				);
			}
			if ( 'tablet' === breakpoint ) {
				return readSlidesPerViewInt(
					carouselEl.getAttribute( 'data-columnstablet' ),
					2
				);
			}
			return readSlidesPerViewInt(
				carouselEl.getAttribute( 'data-columnsdesktop' ),
				1
			);
		}

		/**
		 * Match Swiper spaceBetween, including tablet/phone inherit.
		 *
		 * @param {Element|null} carouselEl
		 * @param {'desktop'|'tablet'|'phone'} breakpoint
		 * @return {string}
		 */
		function readVerticalGapCss( carouselEl, breakpoint ) {
			if ( ! carouselEl ) {
				return '30px';
			}

			var desktop = parseSpaceBetween(
				carouselEl.getAttribute( 'data-spacing' ),
				30
			);
			var tablet = parseSpaceBetween(
				carouselEl.getAttribute( 'data-spacingtablet' ),
				NaN
			);
			var phone = parseSpaceBetween(
				carouselEl.getAttribute( 'data-spacingphone' ),
				NaN
			);
			var gap = desktop;

			if ( 'phone' === breakpoint ) {
				if ( Number.isFinite( phone ) ) {
					gap = phone;
				} else if ( Number.isFinite( tablet ) ) {
					gap = tablet;
				}
			} else if ( 'tablet' === breakpoint && Number.isFinite( tablet ) ) {
				gap = tablet;
			}

			return spacingToCssLength( gap );
		}

		/**
		 * Pin per-slide height so slidesPerView > 1 share the viewport.
		 * No-op for Post Carousel (no `data-vertical-height`).
		 *
		 * @param {Element|null} carouselEl
		 * @param {'horizontal'|'vertical'} orientation
		 * @return {void}
		 */
		function applyVerticalSlideHeightVar( carouselEl, orientation ) {
			if ( ! carouselEl || ! carouselEl.hasAttribute( 'data-vertical-height' ) ) {
				return;
			}

			if ( 'vertical' !== orientation ) {
				carouselEl.style.removeProperty( '--dsm-bc-vertical-slide-height' );
				carouselEl.style.removeProperty( '--dsm-bc-vertical-slide-gap' );
				return;
			}

			var breakpoint = getViewportBreakpoint();
			var height = readVerticalHeight( carouselEl, breakpoint );
			if ( ! height ) {
				carouselEl.style.removeProperty( '--dsm-bc-vertical-slide-height' );
				carouselEl.style.removeProperty( '--dsm-bc-vertical-slide-gap' );
				return;
			}

			if ( /^[-+]?\d*\.?\d+$/.test( String( height ).trim() ) ) {
				height = String( height ).trim() + 'px';
			}

			var spv = readVerticalSlidesPerView( carouselEl, breakpoint );
			var gap = readVerticalGapCss( carouselEl, breakpoint );
			carouselEl.style.setProperty( '--dsm-bc-vertical-slide-gap', gap );
			carouselEl.style.setProperty(
				'--dsm-bc-vertical-slide-height',
				'calc((' +
					height +
					' - (' +
					spv +
					' - 1) * ' +
					gap +
					') / ' +
					spv +
					')'
			);
		}

		/**
		 * Pin `.swiper-container` to the stored vertical height before Swiper measures slides.
		 * No-op for Post Carousel (no `data-vertical-height`).
		 *
		 * @param {Element|null} container
		 * @param {Element|null} carouselEl
		 * @param {'horizontal'|'vertical'} orientation
		 * @return {void}
		 */
		function applyVerticalContainerHeight( container, carouselEl, orientation ) {
			if ( ! container || ! carouselEl || ! carouselEl.hasAttribute( 'data-vertical-height' ) ) {
				return;
			}

			if ( 'vertical' !== orientation ) {
				container.style.height = '';
				applyVerticalSlideHeightVar( carouselEl, orientation );
				return;
			}

			var height = readVerticalHeight( carouselEl, getViewportBreakpoint() );
			if ( height ) {
				container.style.height = height;
			}

			applyVerticalSlideHeightVar( carouselEl, orientation );
		}

		/**
		 * @param {Element} item
		 * @param {'horizontal'|'vertical'} orientation
		 * @return {void}
		 */
		function syncOrientationClass( item, orientation ) {
			if ( ! item || ! item.classList ) {
				return;
			}
			[ 'dsm-blog-carousel-slider', 'dsm-post-carousel-slider' ].forEach(
				function ( prefix ) {
					var horizontal = prefix + '-horizontal';
					var vertical = prefix + '-vertical';
					if (
						item.classList.contains( horizontal ) ||
						item.classList.contains( vertical )
					) {
						item.classList.remove( horizontal, vertical );
						item.classList.add( prefix + '-' + orientation );
					}
				}
			);
		}

		function isVbManagedNode( node ) {
			return (
				node &&
				typeof node.getAttribute === 'function' &&
				node.getAttribute( 'data-dsm-vb-carousel-managed' ) === '1'
			);
		}

		function hasVbStaticClass( node ) {
			return (
				node &&
				node.classList &&
				node.classList.contains( 'dsm-vb-carousel-static' )
			);
		}

		function isVbManagedItem( item ) {
			if ( ! item ) {
				return false;
			}

			if ( hasVbStaticClass( item ) || isVbManagedNode( item ) ) {
				return true;
			}

			if (
				typeof item.closest === 'function' &&
				( item.closest( '.dsm-vb-carousel-static' ) ||
					item.closest( '[data-dsm-vb-carousel-managed="1"]' ) )
			) {
				return true;
			}

			if (
				typeof item.querySelector === 'function' &&
				( item.querySelector( '.dsm-vb-carousel-static' ) ||
					item.querySelector( '[data-dsm-vb-carousel-managed="1"]' ) )
			) {
				return true;
			}

			var carouselRoot = item.querySelector
				? item.querySelector( config.carouselRootSelector )
				: null;

			return hasVbStaticClass( carouselRoot ) || isVbManagedNode( carouselRoot );
		}

		function destroyCarouselItem( item ) {
			if ( isVbManagedItem( item ) ) {
				return;
			}

			destroyAutoplayObservers( item );

			if ( item._dsmPauseHoverBound ) {
				$( item ).off( 'mouseenter.dsmCarouselPause mouseleave.dsmCarouselPause' );
				item._dsmPauseHoverBound = false;
			}

			var container = item.querySelector( config.containerSelector );
			if (
				container &&
				container.swiper &&
				typeof container.swiper.destroy === 'function'
			) {
				try {
					container.swiper.destroy( true, true );
				} catch ( err ) {
					// VB remounts.
				}
			}

			item._dsmCarouselInitialized = false;
		}

		function initCarouselItem( item ) {
			if ( isVbManagedItem( item ) ) {
				return;
			}

			if ( item._dsmCarouselInitialized ) {
				return;
			}

			var $wrap = $( item );
			var $carouselRoot = $wrap.find( config.carouselRootSelector ).first();
			var carouselEl = $carouselRoot[ 0 ];
			var data = $carouselRoot.data() || {};
			var container = item.querySelector( config.containerSelector );

			if ( container && container.swiper ) {
				return;
			}
			var orientation = readOrientation(
				carouselEl,
				getViewportBreakpoint()
			);

			syncOrientationClass( item, orientation );
			item._dsmCarouselOrientation = orientation;
			applyVerticalContainerHeight( container, carouselEl, orientation );

			if ( ! container || typeof Swiper === 'undefined' ) {
				return;
			}

			function readSlideToScroll( breakpoint ) {
				if ( ! carouselEl ) {
					return 1;
				}
				var hyphen = 'data-slide-to-scroll-' + breakpoint;
				var legacy =
					breakpoint === 'desktop'
						? 'data-slidetoscrolldesktop'
						: breakpoint === 'tablet'
						? 'data-slidetoscrolltablet'
						: 'data-slidetoscrollphone';
				var raw =
					carouselEl.getAttribute( hyphen ) ||
					carouselEl.getAttribute( legacy );
				if ( raw !== null && raw !== '' ) {
					var n = parseInt( raw, 10 );
					if ( ! isNaN( n ) && n >= 1 ) {
						return n;
					}
				}
				var ds = carouselEl.dataset || {};
				var camel =
					breakpoint === 'desktop'
						? ds.slideToScrollDesktop
						: breakpoint === 'tablet'
						? ds.slideToScrollTablet
						: ds.slideToScrollPhone;
				if ( camel !== undefined && camel !== '' ) {
					var parsed = parseInt( String( camel ), 10 );
					if ( ! isNaN( parsed ) && parsed >= 1 ) {
						return parsed;
					}
				}
				return 1;
			}

			var navigation = {
				nextEl: item.querySelector( '.swiper-button-next' ),
				prevEl: item.querySelector( '.swiper-button-prev' ),
			};

			var paginationContainer = item.querySelector( '.swiper-pagination' );
			var pagination = {
				el: paginationContainer,
				clickable: true,
				type:
					'progressbar' !== data.pagiButtonStyle
						? 'bullets'
						: 'progressbar',
				dynamicBullets: 'dynamic' === data.pagiButtonStyle,
			};

			var loopInfinite =
				data.multiRow === 'on'
					? false
					: data.loop === true ||
					  data.loop === 1 ||
					  data.loop === '1' ||
					  data.loop === 'on';

			var centeredSlides = data.centered === 'on';
			var touchEnabled = data.touchMove !== 'on';
			var isCubeOrFlip =
				'cube' === data.effect || 'flip' === data.effect;

			var slidesPerGroupDesktop = isCubeOrFlip
				? 1
				: readSlideToScroll( 'desktop' );
			var slidesPerGroupTablet = isCubeOrFlip
				? 1
				: readSlideToScroll( 'tablet' );
			var slidesPerGroupPhone = isCubeOrFlip
				? 1
				: readSlideToScroll( 'phone' );
			var orientationDesktop = readOrientation(
				carouselEl,
				'desktop'
			);
			var orientationTablet = readOrientation(
				carouselEl,
				'tablet'
			);
			var orientationPhone = readOrientation( carouselEl, 'phone' );
			var isLoopOn = centeredSlides ? true : loopInfinite;
			var maxLoopSlidesPerView = isCubeOrFlip
				? 1
				: Math.max(
						Number( data.columnsdesktop ) || 1,
						Number( data.columnstablet ) || 1,
						Number( data.columnsphone ) || 1
				  );
			var maxLoopSlidesPerGroup = Math.max(
				slidesPerGroupDesktop,
				slidesPerGroupTablet,
				slidesPerGroupPhone
			);

			ensureLoopMinimumSlides( container, {
				loop: isLoopOn,
				slidesPerView: maxLoopSlidesPerView,
				slidesPerGroup: maxLoopSlidesPerGroup,
				centeredSlides: centeredSlides,
			} );

			var swiperInstance = new Swiper( container, {
				direction: orientation,
				effect: data.effect,
				coverflowEffect: {
					slideShadows: data.effectShadows === 'on',
					rotate: data.effectCoverflowRotate,
					depth: data.effectCoverflowDepth,
				},
				flipEffect: {
					rotate: 30,
					slideShadows: data.effectShadows === 'on',
				},
				cubeEffect: {
					slideShadows: data.effectShadows === 'on',
					shadow: data.effectShadows === 'on',
					shadowOffset: 20,
					shadowScale: 0.94,
				},
				speed: Number( data.speed ),
				loop: isLoopOn,
				loopAddBlankSlides: false,
				autoplay: {
					enabled: false,
					delay: data.autoplayspeed,
					disableOnInteraction: false,
				},
				mousewheel: data.mousewheel === 'on',
				setWrapperSize:
					! isCubeOrFlip &&
					! (
						carouselEl &&
						carouselEl.hasAttribute( 'data-vertical-height' ) &&
						'vertical' === orientation
					),
				observer: true,
				observeParents: true,
				observeSlideChildren: true,
				slideClass: config.slideClass,
				wrapperClass: config.wrapperClass,
				navigation: navigation,
				pagination: pagination,
				centeredSlides: centeredSlides,
				grid: {
					rows: data.multiRow === 'on' ? Number( data.row ) : 1,
					fill: 'row',
				},
				grabCursor: touchEnabled && data.grab === 'on',
				allowTouchMove: touchEnabled,
				simulateTouch: touchEnabled,
				slidesPerGroup: slidesPerGroupDesktop,
				spaceBetween: isCubeOrFlip
					? 0
					: readSpaceBetweenFromData( data, 'desktop' ),
				a11y: {
					enabled: false,
					slideRole: 'group',
				},
				breakpoints: {
					320: {
						direction: orientationPhone,
						slidesPerView: isCubeOrFlip ? 1 : Number( data.columnsphone ),
						slidesPerGroup: slidesPerGroupPhone,
						spaceBetween: isCubeOrFlip
							? 0
							: readSpaceBetweenFromData( data, 'phone' ),
						grid: {
							rows:
								data.multiRow === 'on'
									? Number( data.rowsphone )
									: 1,
							fill: 'row',
						},
					},
					480: {
						direction: orientationPhone,
						slidesPerView: isCubeOrFlip ? 1 : Number( data.columnsphone ),
						slidesPerGroup: slidesPerGroupPhone,
						spaceBetween: isCubeOrFlip
							? 0
							: readSpaceBetweenFromData( data, 'phone' ),
						grid: {
							rows:
								data.multiRow === 'on'
									? Number( data.rowsphone )
									: 1,
							fill: 'row',
						},
					},
					768: {
						direction: orientationTablet,
						slidesPerView: isCubeOrFlip ? 1 : Number( data.columnstablet ),
						slidesPerGroup: slidesPerGroupTablet,
						spaceBetween: isCubeOrFlip
							? 0
							: readSpaceBetweenFromData( data, 'tablet' ),
						grid: {
							rows:
								data.multiRow === 'on'
									? Number( data.rowstablet )
									: 1,
							fill: 'row',
						},
					},
					981: {
						direction: orientationDesktop,
						slidesPerView: isCubeOrFlip ? 1 : Number( data.columnsdesktop ),
						slidesPerGroup: slidesPerGroupDesktop,
						spaceBetween: isCubeOrFlip
							? 0
							: readSpaceBetweenFromData( data, 'desktop' ),
						grid: {
							rows: data.multiRow === 'on' ? Number( data.row ) : 1,
							fill: 'row',
						},
					},
				},
			} );

			item._dsmCarouselSwiper = swiperInstance;
			item._dsmCarouselInitialized = true;

			if (
				carouselEl &&
				carouselEl.hasAttribute( 'data-vertical-height' ) &&
				'vertical' === orientation &&
				swiperInstance &&
				typeof swiperInstance.update === 'function'
			) {
				applyVerticalContainerHeight(
					container,
					carouselEl,
					orientation
				);
				swiperInstance.update();
			}

			if ( data.pauseOnHover === 'on' ) {
				$wrap
					.off( 'mouseenter.dsmCarouselPause mouseleave.dsmCarouselPause' )
					.on( 'mouseenter.dsmCarouselPause', function () {
						stopAutoplay( container.swiper || swiperInstance );
					} )
					.on( 'mouseleave.dsmCarouselPause', function () {
						startAutoplay( container.swiper || swiperInstance );
					} );
				item._dsmPauseHoverBound = true;
			}

			var autoplayOn =
				data.autoplay === 'on' ||
				data.autoplay === true ||
				data.autoplay === 1;

			if ( autoplayOn ) {
				destroyAutoplayObservers( item );
				bindViewportAutoplay( item, data.autoplayViewport, function () {
					startAutoplay( container.swiper || swiperInstance );
				} );
			}
		}

		function refreshOrInitInRoot( root ) {
			if ( ! root ) {
				return;
			}

			$( root )
				.find( config.rootSelector )
				.each( function () {
					destroyCarouselItem( this );
					initCarouselItem( this );
				} );
		}

		function bootDocument() {
			$( config.rootSelector ).each( function () {
				initCarouselItem( this );
			} );
		}

		function syncOrientationToViewport() {
			$( config.rootSelector ).each( function () {
				if ( isVbManagedItem( this ) ) {
					return;
				}
				var carouselEl = this.querySelector(
					config.carouselRootSelector
				);
				var next = readOrientation(
					carouselEl,
					getViewportBreakpoint()
				);
				if (
					this._dsmCarouselInitialized &&
					this._dsmCarouselOrientation === next
				) {
					syncOrientationClass( this, next );
					var sameContainer = this.querySelector(
						config.containerSelector
					);
					applyVerticalContainerHeight(
						sameContainer,
						carouselEl,
						next
					);
					if (
						sameContainer &&
						sameContainer.swiper &&
						typeof sameContainer.swiper.update === 'function'
					) {
						sameContainer.swiper.update();
					}
					return;
				}
				destroyCarouselItem( this );
				initCarouselItem( this );
			} );
		}

		var orientationResizeTimer = null;
		$( window ).on( 'resize.dsmPostBlogCarouselOrientation', function () {
			if ( orientationResizeTimer ) {
				window.clearTimeout( orientationResizeTimer );
			}
			orientationResizeTimer = window.setTimeout(
				syncOrientationToViewport,
				150
			);
		} );

		window[ config.reinitGlobalName ] = refreshOrInitInRoot;

		[ 'dsm:reinit-library-modules-in-root', 'dsm:reinit-carousels-in-root' ].forEach(
			function ( eventName ) {
				window.addEventListener( eventName, function ( event ) {
					var root = event && event.detail ? event.detail.root : null;
					if ( root ) {
						refreshOrInitInRoot( root );
					}
				} );
			}
		);

		$( bootDocument );
	};
} );
