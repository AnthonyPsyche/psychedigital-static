/**
 * Image Carousel — vanilla JS (Swiper, lazy backgrounds, responsive gallery).
 * Magnific Popup lightbox still uses `jQuery.fn.magnificPopup` when present (jQuery plugin).
 */
( function () {
	'use strict';

	var IC_SEL = '.dsm_image_carousel_container';
	var IC_ROOT_SEL = '.dsm_image_carousel';

	/** Animate.css class names bundled in `dsm-supreme-animate` (strip before re-applying). */
	var DSM_IC_ANIM_CLASS_NAMES = [
		'bounce',
		'flash',
		'pulse',
		'rubberBand',
		'shake',
		'swing',
		'tada',
		'wobble',
		'jello',
		'heartBeat',
		'fadeIn',
		'fadeInDown',
		'fadeInDownBig',
		'fadeInLeft',
		'fadeInLeftBig',
		'fadeInRight',
		'fadeInRightBig',
		'fadeInUp',
		'fadeInUpBig',
		'flipInX',
		'flipInY',
		'lightSpeedIn',
		'rotateIn',
		'rotateInDownLeft',
		'rotateInDownRight',
		'rotateInUpLeft',
		'rotateInUpRight',
		'slideInUp',
		'slideInDown',
		'slideInLeft',
		'slideInRight',
		'bounceIn',
		'bounceInDown',
		'bounceInLeft',
		'bounceInRight',
		'bounceInUp',
		'zoomIn',
		'zoomInDown',
		'zoomInLeft',
		'zoomInRight',
		'zoomInUp',
		'jackInTheBox',
		'rollIn',
	];

	var DSM_IC_ANIM_OUT_CLASS_NAMES = [
		'bounceOut',
		'bounceOutDown',
		'bounceOutLeft',
		'bounceOutRight',
		'bounceOutUp',
		'fadeOut',
		'fadeOutDown',
		'fadeOutDownBig',
		'fadeOutLeft',
		'fadeOutLeftBig',
		'fadeOutRight',
		'fadeOutRightBig',
		'fadeOutUp',
		'fadeOutUpBig',
		'flipOutX',
		'flipOutY',
		'lightSpeedOut',
		'rollOut',
		'slideOutDown',
		'slideOutLeft',
		'slideOutRight',
		'slideOutUp',
		'zoomOut',
		'zoomOutDown',
		'zoomOutLeft',
		'zoomOutRight',
		'zoomOutUp',
	];

	var DSM_IC_ALL_TITLE_ANIM_CLASS_NAMES = DSM_IC_ANIM_CLASS_NAMES.concat(
		DSM_IC_ANIM_OUT_CLASS_NAMES
	);

	/** @type {WeakMap<Element, Record<string, *>>} */
	var icStore = new WeakMap();

	function icGet( el ) {
		if ( ! icStore.has( el ) ) {
			icStore.set( el, {} );
		}
		return icStore.get( el );
	}

	function dataAttrToCamel( name ) {
		return name.replace( /-([a-z])/g, function ( _, c ) {
			return c.toUpperCase();
		} );
	}

	/**
	 * Normalize title animation duration/delay from data attributes (ms digits or legacy `1s`).
	 *
	 * @param {string|undefined|null} raw
	 * @param {string} fallbackDigits Milliseconds without unit.
	 * @returns {string}
	 */
	function dsmIcNormalizeCssAnimationTime( raw, fallbackDigits ) {
		var s = raw == null ? '' : String( raw ).trim();
		if ( s === '' ) {
			return fallbackDigits + 'ms';
		}
		if ( /ms$/i.test( s ) ) {
			return s;
		}
		if ( /^-?\d+(\.\d+)?s$/i.test( s ) ) {
			return s;
		}
		if ( /^-?\d+(\.\d+)?$/.test( s ) ) {
			return s + 'ms';
		}
		return fallbackDigits + 'ms';
	}

	/**
	 * @param {string|number|undefined|null} cssTime
	 * @returns {number}
	 */
	function dsmIcCssTimeToMs( cssTime ) {
		var s = cssTime == null ? '' : String( cssTime ).trim();
		if ( s === '' ) {
			return 0;
		}
		if ( /ms$/i.test( s ) ) {
			return parseFloat( s ) || 0;
		}
		if ( /^-?\d+(\.\d+)?s$/i.test( s ) && ! /ms$/i.test( s ) ) {
			return ( parseFloat( s ) || 0 ) * 1000;
		}
		var n = parseFloat( s );
		return isNaN( n ) ? 0 : n;
	}

	function dsmIcStripAnimateCssClasses( el ) {
		if ( ! el ) {
			return;
		}
		el.classList.remove( 'animated' );
		for ( var ci = 0; ci < DSM_IC_ALL_TITLE_ANIM_CLASS_NAMES.length; ci++ ) {
			el.classList.remove( DSM_IC_ALL_TITLE_ANIM_CLASS_NAMES[ ci ] );
		}
		el.style.animationDuration = '';
		el.style.animationDelay = '';
	}

	function dsmIcOutTimingMsPair( container, durKey, delKey ) {
		var oduIc = dsmIcNormalizeCssAnimationTime(
			readData( container, durKey ),
			'1000'
		);
		var odlIc = dsmIcNormalizeCssAnimationTime(
			readData( container, delKey ),
			'0'
		);
		return Math.ceil(
			dsmIcCssTimeToMs( odlIc ) + dsmIcCssTimeToMs( oduIc ) + 50
		);
	}

	function dsmIcTheoreticalCaptionOutPadMs( container ) {
		if ( readData( container, 'type' ) !== 'slideshow' ) {
			return 0;
		}
		var max = 0;
		var showTitle = readData( container, 'slideshow-show-slide-title' ) === true;
		var showDesc = readData( container, 'slideshow-show-slide-description' ) === true;

		var tAnim = readData( container, 'slideshow-title-animation-out' );
		if (
			showTitle &&
			( tAnim === undefined || tAnim === null || tAnim === '' )
		) {
			tAnim = 'fadeOutDown';
		}
		if ( showTitle && tAnim && tAnim !== 'none' ) {
			max = Math.max(
				max,
				dsmIcOutTimingMsPair(
					container,
					'slideshow-title-animation-out-duration',
					'slideshow-title-animation-out-delay'
				)
			);
		}

		var dAnim = readData( container, 'slideshow-description-animation-out' );
		if (
			showDesc &&
			( dAnim === undefined || dAnim === null || dAnim === '' )
		) {
			dAnim = 'fadeOutDown';
		}
		if ( showDesc && dAnim && dAnim !== 'none' ) {
			max = Math.max(
				max,
				dsmIcOutTimingMsPair(
					container,
					'slideshow-description-animation-out-duration',
					'slideshow-description-animation-out-delay'
				)
			);
		}

		var wrapAnim = readData( container, 'slideshow-wrapper-animation-out' );
		if (
			wrapAnim &&
			wrapAnim !== 'none' &&
			( showTitle || showDesc )
		) {
			max = Math.max(
				max,
				dsmIcOutTimingMsPair(
					container,
					'slideshow-wrapper-animation-out-duration',
					'slideshow-wrapper-animation-out-delay'
				)
			);
		}

		return max;
	}

	function dsmIcLiveCaptionOutMsFromSlide( fromSlide, container ) {
		if ( ! fromSlide ) {
			return 0;
		}
		var showTitle = readData( container, 'slideshow-show-slide-title' ) === true;
		var showDesc = readData( container, 'slideshow-show-slide-description' ) === true;

		var wrapEl = fromSlide.querySelector( '.dsm_image_carousel_slideshow_content' );
		var titleEl = fromSlide.querySelector( '.dsm_image_carousel_slide_title' );
		var descEl = fromSlide.querySelector( '.dsm_image_carousel_slide_description' );

		var max = 0;

		var tAnim = readData( container, 'slideshow-title-animation-out' );
		if (
			showTitle &&
			( tAnim === undefined || tAnim === null || tAnim === '' )
		) {
			tAnim = 'fadeOutDown';
		}
		if ( showTitle && titleEl && tAnim && tAnim !== 'none' ) {
			max = Math.max(
				max,
				dsmIcOutTimingMsPair(
					container,
					'slideshow-title-animation-out-duration',
					'slideshow-title-animation-out-delay'
				)
			);
		}

		var dAnim = readData( container, 'slideshow-description-animation-out' );
		if (
			showDesc &&
			( dAnim === undefined || dAnim === null || dAnim === '' )
		) {
			dAnim = 'fadeOutDown';
		}
		if ( showDesc && descEl && dAnim && dAnim !== 'none' ) {
			max = Math.max(
				max,
				dsmIcOutTimingMsPair(
					container,
					'slideshow-description-animation-out-duration',
					'slideshow-description-animation-out-delay'
				)
			);
		}

		var wAnim = readData( container, 'slideshow-wrapper-animation-out' );
		if ( wrapEl && wAnim && wAnim !== 'none' && ( showTitle || showDesc ) ) {
			max = Math.max(
				max,
				dsmIcOutTimingMsPair(
					container,
					'slideshow-wrapper-animation-out-duration',
					'slideshow-wrapper-animation-out-delay'
				)
			);
		}

		return max;
	}

	function parseDataValue( str ) {
		if ( str === 'true' ) {
			return true;
		}
		if ( str === 'false' ) {
			return false;
		}
		if ( str === '' || str === null || typeof str === 'undefined' ) {
			return str;
		}
		var n = Number( str );
		if ( ! isNaN( n ) && String( str ).trim() !== '' ) {
			return n;
		}
		return str;
	}

	/**
	 * Read `data-*` like jQuery `.data( name )` (kebab-case key).
	 *
	 * @param {Element} el
	 * @param {string} key kebab-case, e.g. `autoplay-speed`
	 * @return {*}
	 */
	function readData( el, key ) {
		var camel = dataAttrToCamel( key );
		if ( ! el.dataset || typeof el.dataset[ camel ] === 'undefined' ) {
			return undefined;
		}
		return parseDataValue( el.dataset[ camel ] );
	}

	var DSM_IC_LOOP_MIN_CLONE_CLASS = 'dsm-image-carousel-loop-minimum-clone';

	/**
	 * Parse a positive integer from a data-* value. Empty, 0, or NaN uses fallback (min 1).
	 *
	 * @param {*} raw
	 * @param {number|string} fallback
	 * @return {number}
	 */
	function dsmIcPositiveInt( raw, fallback ) {
		var leaf = raw;
		if (
			leaf &&
			typeof leaf === 'object' &&
			! Array.isArray( leaf ) &&
			Object.prototype.hasOwnProperty.call( leaf, 'value' )
		) {
			leaf = leaf.value;
		}
		var n = parseFloat(
			String(
				leaf == null || leaf === true || leaf === false ? '' : leaf
			).trim()
		);
		if ( ! isNaN( n ) && n >= 1 ) {
			return Math.max( 1, Math.round( n ) );
		}
		var fb = parseFloat(
			String(
				fallback == null || fallback === true || fallback === false
					? ''
					: fallback
			).trim()
		);
		return ! isNaN( fb ) && fb >= 1 ? Math.max( 1, Math.round( fb ) ) : 1;
	}

	/**
	 * Swiper Grid only when multiple rows is actually used. `grid.rows: 1` still
	 * enables the Grid module and can ignore slidesPerView changes (VB + FE).
	 *
	 * @param {number} rows
	 * @return {{ rows: number, fill: string }|null}
	 */
	function dsmIcGridIfMultiRow( rows ) {
		var r = dsmIcPositiveInt( rows, 1 );
		if ( r < 2 ) {
			return null;
		}
		return {
			rows: r,
			fill: 'row',
		};
	}

	/**
	 * @param {number} slidesPerView
	 * @param {number} slidesPerGroup
	 * @param {number} spaceBetween
	 * @param {number} rows
	 * @return {Object}
	 */
	function dsmIcBreakpointParams(
		slidesPerView,
		slidesPerGroup,
		spaceBetween,
		rows
	) {
		var bp = {
			slidesPerView: slidesPerView,
			slidesPerGroup: slidesPerGroup,
			spaceBetween: spaceBetween,
		};
		var grid = dsmIcGridIfMultiRow( rows );
		if ( grid ) {
			bp.grid = grid;
		}
		return bp;
	}

	/**
	 * Resolve slidesPerView from a data attr. Missing/empty uses emptyFallback (PHP: tablet 2, phone 1).
	 *
	 * @param {Element} container
	 * @param {string} key kebab-case data key
	 * @param {number} emptyFallback
	 * @return {number}
	 */
	function dsmIcSlidesPerViewFromData( container, key, emptyFallback ) {
		var raw = readData( container, key );
		if ( raw === '' || typeof raw === 'undefined' || raw === null ) {
			return dsmIcPositiveInt( emptyFallback, 1 );
		}
		return dsmIcPositiveInt( raw, emptyFallback );
	}

	/**
	 * Numeric data attr (0 is valid). Missing/empty uses fallback.
	 *
	 * @param {*} raw
	 * @param {number} fallback
	 * @return {number}
	 */
	function dsmIcNumberOr( raw, fallback ) {
		if ( raw === '' || typeof raw === 'undefined' || raw === null ) {
			return fallback;
		}
		var n = Number( raw );
		return isNaN( n ) ? fallback : n;
	}

	/**
	 * @param {*} effectVal
	 * @param {*} typeVal
	 * @return {boolean}
	 */
	function dsmIcIsSingleSlideView( effectVal, typeVal ) {
		return (
			'cube' === effectVal ||
			'flip' === effectVal ||
			'slideshow' === typeVal
		);
	}

	/**
	 * Swiper 12 loop requires slide count >= slidesPerView + slidesPerGroup (+1 when centered).
	 *
	 * @param {number} slidesPerView
	 * @param {number} slidesPerGroup
	 * @param {boolean} centeredSlides
	 * @return {number}
	 */
	function dsmIcGetLoopMinimumSlideCount(
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
	 * @param {boolean} infinite
	 * @return {number}
	 */
	function dsmIcGetLoopTargetSlideCount(
		slideCount,
		slidesPerView,
		slidesPerGroup,
		centeredSlides,
		infinite
	) {
		var group = Math.max( 1, Number( slidesPerGroup ) || 1 );
		var count = Math.max( 0, Number( slideCount ) || 0 );
		var target = dsmIcGetLoopMinimumSlideCount(
			slidesPerView,
			group,
			centeredSlides
		);

		if ( infinite ) {
			target = Math.max(
				target,
				Math.max( 1, Number( slidesPerView ) || 1 ) * 2,
				6
			);
		}

		target = Math.max( count, target );
		var remainder = target % group;

		if ( 0 !== remainder ) {
			target += group - remainder;
		}

		return target;
	}

	/**
	 * @param {Element|null|undefined} wrapper
	 * @return {void}
	 */
	function dsmIcRemoveLoopMinClones( wrapper ) {
		if ( ! wrapper || typeof wrapper.querySelectorAll !== 'function' ) {
			return;
		}
		wrapper
			.querySelectorAll(
				'.' + DSM_IC_LOOP_MIN_CLONE_CLASS + ', .swiper-slide-blank'
			)
			.forEach( function ( node ) {
				if ( node.parentNode ) {
					node.parentNode.removeChild( node );
				}
			} );
	}

	/**
	 * Pad real slides before Swiper init so loop / infinite smooth scrolling can keep
	 * breakpoint slidesPerView (card-carousel loop minimum; infinite also fills ~2× view).
	 *
	 * @param {Element|null|undefined} wrapper
	 * @param {{ loop?: boolean, infinite?: boolean, slidesPerView?: number, slidesPerGroup?: number, centeredSlides?: boolean }} options
	 * @return {void}
	 */
	function dsmIcEnsureLoopMinimumSlides( wrapper, options ) {
		if ( ! wrapper || ! options ) {
			return;
		}
		if ( ! options.loop && ! options.infinite ) {
			return;
		}

		dsmIcRemoveLoopMinClones( wrapper );

		var realSlides = Array.prototype.filter.call(
			wrapper.children,
			function ( slide ) {
				return (
					slide.nodeType === 1 &&
					! slide.classList.contains( 'swiper-slide-duplicate' ) &&
					! slide.classList.contains( 'swiper-slide-blank' ) &&
					! slide.classList.contains( DSM_IC_LOOP_MIN_CLONE_CLASS )
				);
			}
		);
		var slideCount = realSlides.length;
		if ( slideCount === 0 ) {
			return;
		}

		var group = Math.max( 1, Number( options.slidesPerGroup ) || 1 );
		var target = dsmIcGetLoopTargetSlideCount(
			slideCount,
			options.slidesPerView,
			group,
			!! options.centeredSlides,
			!! options.infinite
		);

		if ( slideCount >= target && 0 === slideCount % group ) {
			return;
		}

		var totalSlides = slideCount;
		var cycle = 0;
		var maxSlides = target + slideCount * group;

		while (
			( totalSlides < target || 0 !== totalSlides % group ) &&
			totalSlides < maxSlides
		) {
			var src = realSlides[ cycle % slideCount ];
			if ( ! src ) {
				break;
			}
			var clone = src.cloneNode( true );
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
			clone.classList.add( DSM_IC_LOOP_MIN_CLONE_CLASS );
			clone.setAttribute( 'aria-hidden', 'true' );
			wrapper.appendChild( clone );
			totalSlides += 1;
			cycle += 1;
		}
	}

	function nextSiblingMatch( el, selector ) {
		var s = el.nextElementSibling;
		while ( s ) {
			if ( s.matches && s.matches( selector ) ) {
				return s;
			}
			s = s.nextElementSibling;
		}
		return null;
	}

	function siblingsMatch( el, selector ) {
		var p = el.parentElement;
		if ( ! p ) {
			return [];
		}
		return Array.prototype.filter.call( p.children, function ( c ) {
			return c !== el && c.matches( selector );
		} );
	}

	function dsmIcGetGalleryBreakpoint() {
		if ( window.matchMedia( '(min-width: 981px)' ).matches ) {
			return 'desktop';
		}
		if ( window.matchMedia( '(min-width: 768px)' ).matches ) {
			return 'tablet';
		}
		return 'phone';
	}

	function dsmIcParseResponsivePayload( container ) {
		var script = nextSiblingMatch( container, '.dsm-ic-responsive-gallery' );
		if ( ! script ) {
			return null;
		}
		try {
			return JSON.parse( script.textContent || '' );
		} catch ( e ) {
			return null;
		}
	}

	function dsmIcApplyResponsiveGallery( container, payload ) {
		if ( ! payload ) {
			return;
		}
		var bp = dsmIcGetGalleryBreakpoint();
		var mainWrapper = container.querySelector( '.swiper-wrapper' );
		var thumbs = siblingsMatch( container, '.dsm_image_gallery_thumbs' )[ 0 ];
		var thumbWrapper = thumbs
			? thumbs.querySelector( '.swiper-wrapper' )
			: null;

		var st = icGet( container );
		if ( ! st.dsmIcDesktopMainHtml && mainWrapper ) {
			st.dsmIcDesktopMainHtml = mainWrapper.innerHTML;
			if ( thumbWrapper ) {
				st.dsmIcDesktopThumbsHtml = thumbWrapper.innerHTML;
			}
		}

		var htmlMain = st.dsmIcDesktopMainHtml;
		var htmlThumbs = st.dsmIcDesktopThumbsHtml || '';
		var typeVal = readData( container, 'type' );

		if ( bp === 'tablet' && payload.tablet && payload.tablet.main ) {
			htmlMain = payload.tablet.main;
			if ( 'slideshow' === typeVal && payload.tablet.thumbs ) {
				htmlThumbs = payload.tablet.thumbs;
			}
		} else if ( bp === 'phone' ) {
			if ( payload.phone && payload.phone.main ) {
				htmlMain = payload.phone.main;
				if ( 'slideshow' === typeVal && payload.phone.thumbs ) {
					htmlThumbs = payload.phone.thumbs;
				}
			} else if ( payload.tablet && payload.tablet.main ) {
				htmlMain = payload.tablet.main;
				if ( 'slideshow' === typeVal && payload.tablet.thumbs ) {
					htmlThumbs = payload.tablet.thumbs;
				}
			}
		}

		if ( mainWrapper ) {
			mainWrapper.innerHTML = htmlMain;
		}
		if ( thumbWrapper && htmlThumbs ) {
			thumbWrapper.innerHTML = htmlThumbs;
		}
	}

	function dsmIcDebouncedResize( fn, ms ) {
		var t;
		return function () {
			clearTimeout( t );
			t = setTimeout( fn, ms );
		};
	}

	/**
	 * @param {Element} root Module root (`.dsm_image_carousel`).
	 */
	function dsmIcObserveLazyBackgrounds( root ) {
		if (
			! root ||
			typeof IntersectionObserver === 'undefined'
		) {
			return;
		}
		var pending = root.querySelectorAll(
			'[data-dsm-lazy-bg]:not([data-dsm-bg-loaded])'
		);
		if ( ! pending.length ) {
			return;
		}
		var obs = new IntersectionObserver(
			function ( entries ) {
				entries.forEach( function ( entry ) {
					if ( ! entry.isIntersecting ) {
						return;
					}
					var el = entry.target;
					var url = el.getAttribute( 'data-dsm-lazy-bg' );
					if ( url ) {
						el.style.backgroundImage =
							'url("' +
							url.replace( /\\/g, '\\\\' ).replace( /"/g, '\\"' ) +
							'")';
						el.setAttribute( 'data-dsm-bg-loaded', '1' );
					}
					obs.unobserve( el );
				} );
			},
			{ rootMargin: '200px 0px', threshold: 0.01 }
		);
		Array.prototype.forEach.call( pending, function ( el ) {
			obs.observe( el );
		} );
	}

	/**
	 * Magnific `item.el` may be jQuery or DOM.
	 *
	 * @param {*} el
	 * @return {Element|null}
	 */
	function toDom( el ) {
		if ( ! el ) {
			return null;
		}
		if ( el.nodeType === 1 ) {
			return el;
		}
		if ( el[ 0 ] && el[ 0 ].nodeType === 1 ) {
			return el[ 0 ];
		}
		return null;
	}

	function initMagnificWhenPossible( rootEl, options ) {
		if (
			typeof window.jQuery !== 'undefined' &&
			window.jQuery.fn &&
			window.jQuery.fn.magnificPopup
		) {
			window.jQuery( rootEl ).magnificPopup( options );
		}
	}

	function bindLightboxForContainers( containers ) {
		Array.prototype.forEach.call( containers, function ( container ) {
			var carouselType = container.getAttribute( 'data-type' );
			var lightboxTitle = readData( container, 'lightbox-title' );
			var lightboxCaption = readData( container, 'lightbox-caption' );

			var gallery_check;
			if ( readData( container, 'lightbox-gallery' ) === true ) {
				gallery_check = {
					enabled: true,
					navigateByImgClick: false,
					preload: [ 0, 1 ],
					tCounter: '',
				};
			} else {
				gallery_check = { enabled: false };
			}

			var caption_check = {
				titleSrc: function ( item ) {
					var root = toDom( item.el );
					if ( ! root ) {
						return '';
					}
					var img =
						'slideshow' !== carouselType
							? root.querySelector( 'img' )
							: root.querySelector(
									'.dsm_image_carousel_slideshow_bg'
							  );
					var Title = '';
					var Caption = '';
					if ( lightboxCaption === true && img ) {
						var desc = img.getAttribute( 'data-dsm-image-description' ) || '';
						Caption =
							desc !== ''
								? '<small>' +
								  desc.replace( /[^]/g, function ( c ) {
										return (
											'&#' + c.charCodeAt( 0 ) + ';'
										);
								  } ) +
								  '</small>'
								: '';
					}
					if ( lightboxTitle === true && img ) {
						var t = img.getAttribute( 'title' );
						Title =
							typeof t === 'undefined' || t === ''
								? ''
								: t.replace( /[^]/g, function ( c ) {
										return '&#' + c.charCodeAt( 0 ) + ';';
								  } );
					}

					return Title + Caption;
				},
			};

			if ( readData( container, 'show-lightbox' ) === true ) {
				var showLightboxPopup = {
					type: 'image',
					delegate: 'a.dsm_image_carousel_lightbox',
					removalDelay: 500,
					gallery: gallery_check,
					image: caption_check,
					mainClass: 'mfp-fade',
					zoom: {
						enabled: true,
						duration: 500,
						opener: function ( element ) {
							var el = toDom( element );
							if ( ! el ) {
								return null;
							}
							var img =
								'slideshow' !== carouselType
									? el.querySelector( 'img' )
									: el.querySelector(
											'.dsm_image_carousel_slideshow_bg'
									  );
							if (
								img &&
								typeof window.jQuery !== 'undefined'
							) {
								return window.jQuery( img );
							}
							return img;
						},
					},
					callbacks: {
						open: function () {
							if (
								this.currItem &&
								this.currItem.el &&
								this.currItem.el[ 0 ] &&
								this.currItem.el[ 0 ].offsetParent
							) {
								this.currItem.el[ 0 ].offsetParent.getAttribute(
									'data-swiper-slide-index'
								);
							}
						},
					},
					preload: [ 0, 1 ],
					allowHTMLInTemplate: true,
				};

				initMagnificWhenPossible( container, showLightboxPopup );

				if ( readData( container, 'lightbox-gallery' ) === true ) {
					container.addEventListener( 'click', function ( event ) {
						var t = event.target.closest(
							'.dsm_image_carousel_item.swiper-slide-duplicate a.dsm_image_carousel_lightbox'
						);
						if ( ! t ) {
							return;
						}
						event.preventDefault();
						var href = t.getAttribute( 'href' );
						if (
							! href ||
							typeof window.jQuery === 'undefined' ||
							! window.jQuery.fn.magnificPopup
						) {
							return;
						}
						var links = container.querySelectorAll(
							'.dsm_image_carousel_item:not(.swiper-slide-duplicate) a.dsm_image_carousel_lightbox'
						);
						Array.prototype.forEach.call( links, function ( a, index ) {
							if ( a.getAttribute( 'href' ) === href ) {
								window.jQuery( container ).magnificPopup(
									'open',
									index
								);
							}
						} );
					} );
				}
			}
		} );
	}

	function initCarouselInstance( container, options ) {
		options = options || {};
		var st = icGet( container );
		if ( st.dsmIcTitleOutTimerId ) {
			window.clearTimeout( st.dsmIcTitleOutTimerId );
			st.dsmIcTitleOutTimerId = null;
		}
		st.dsmIcTitleOutBusy = false;
		var payload = st.dsmIcPayload;
		if ( ! payload ) {
			payload = dsmIcParseResponsivePayload( container );
			if ( payload ) {
				st.dsmIcPayload = payload;
			}
		}
		if ( ! options.skipApply ) {
			if ( payload ) {
				dsmIcApplyResponsiveGallery( container, payload );
			}
		}
		st.dsmIcCurrentBp = dsmIcGetGalleryBreakpoint();

		var lazyOn = container.getAttribute( 'data-lazyload' ) === 'true';

		var swiperWrapper = container.querySelector( '.swiper-wrapper' );

		var imageCarouselThumbs = siblingsMatch(
			container,
			'.dsm_image_gallery_thumbs'
		)[ 0 ];

		var prevNavButton = siblingsMatch(
			container,
			'.swiper-button-prev'
		)[ 0 ];
		var nextNavButton = siblingsMatch(
			container,
			'.swiper-button-next'
		)[ 0 ];

		var typeVal = readData( container, 'type' );
		var effectVal = readData( container, 'effect' );
		var slideshowEffectVal = readData( container, 'slideshow-effect' );
		var isInfiniteScrolling =
			readData( container, 'infinite-scrolling' ) === true;
		var isLoop = readData( container, 'loop' ) === true;
		var isCentered = readData( container, 'centered-slides' ) === true;
		var isSingleView = dsmIcIsSingleSlideView( effectVal, typeVal );

		var slidesPerViewDesktop = isSingleView
			? 1
			: dsmIcSlidesPerViewFromData( container, 'slide-to-show', 4 );
		var slidesPerViewTablet = isSingleView
			? 1
			: dsmIcSlidesPerViewFromData(
					container,
					'slide-to-show-tablet',
					2
			  );
		var slidesPerViewPhone = isSingleView
			? 1
			: dsmIcSlidesPerViewFromData(
					container,
					'slide-to-show-phone',
					1
			  );

		var slidesPerGroupDesktop = dsmIcPositiveInt(
			readData( container, 'slide-to-scroll' ),
			1
		);
		var slidesPerGroupTablet = dsmIcPositiveInt(
			readData( container, 'slide-to-scroll-tablet' ),
			1
		);
		var slidesPerGroupPhone = dsmIcPositiveInt(
			readData( container, 'slide-to-scroll-phone' ),
			1
		);

		var spaceDesktop = dsmIcNumberOr(
			readData( container, 'space-between' ),
			0
		);
		var spaceTablet = dsmIcNumberOr(
			readData( container, 'space-between-tablet' ),
			spaceDesktop
		);
		var spacePhone = dsmIcNumberOr(
			readData( container, 'space-between-phone' ),
			spaceDesktop
		);

		var slideRowDesktop = dsmIcPositiveInt(
			readData( container, 'slide-row' ),
			1
		);
		var slideRowTablet = dsmIcPositiveInt(
			readData( container, 'slide-row-tablet' ),
			slideRowDesktop
		);
		var slideRowPhone = dsmIcPositiveInt(
			readData( container, 'slide-row-phone' ),
			slideRowTablet
		);

		var maxLoopSlidesPerView = Math.max(
			slidesPerViewDesktop,
			slidesPerViewTablet,
			slidesPerViewPhone
		);
		var maxLoopSlidesPerGroup = Math.max(
			slidesPerGroupDesktop,
			slidesPerGroupTablet,
			slidesPerGroupPhone
		);

		dsmIcEnsureLoopMinimumSlides( swiperWrapper, {
			loop: isLoop,
			infinite: isInfiniteScrolling,
			slidesPerView: maxLoopSlidesPerView,
			slidesPerGroup: maxLoopSlidesPerGroup,
			centeredSlides: isCentered,
		} );

		var autoplaySpeed = isInfiniteScrolling
			? 0
			: parseInt(
					String( readData( container, 'autoplay-speed' ) || '0' ),
					10
			  );

		var slideshowToShowDesktop = dsmIcSlidesPerViewFromData(
			container,
			'slideshow-to-show',
			4
		);
		var slideshowToShowTablet = dsmIcSlidesPerViewFromData(
			container,
			'slideshow-to-show-tablet',
			slideshowToShowDesktop
		);
		var slideshowToShowPhone = dsmIcSlidesPerViewFromData(
			container,
			'slideshow-to-show-phone',
			slideshowToShowTablet
		);

		var slideShowSwiper;

		if ( imageCarouselThumbs ) {
			slideShowSwiper = new window.Swiper( imageCarouselThumbs, {
				init: true,
				loop: true,
				loopAddBlankSlides: false,
				freeMode: false,
				watchSlidesVisibility: true,
				watchSlidesProgress: true,
				resizeObserver: true,
				observer: true,
				observeParents: true,
				observeSlideChildren: true,
				lazyPreloadPrevNext: lazyOn ? 2 : 0,
				slidesPerView: slideshowToShowPhone,
				breakpoints: {
					981: {
						slidesPerView: slideshowToShowDesktop,
						spaceBetween: spaceDesktop,
					},
					768: {
						slidesPerView: slideshowToShowTablet,
						spaceBetween: spaceTablet,
					},
					480: {
						slidesPerView: slideshowToShowPhone,
						spaceBetween: spacePhone,
					},
					320: {
						slidesPerView: slideshowToShowPhone,
						spaceBetween: spacePhone,
					},
				},
			} );
		}

		var titleOutPadMs =
			'slideshow' === typeVal ? dsmIcTheoreticalCaptionOutPadMs( container ) : 0;

		// Pagination markup is a sibling of `.dsm_image_carousel_container` (carousel only; slideshow uses thumbnails).
		var paginationEl =
			'carousel' === typeVal
				? siblingsMatch( container, '.swiper-pagination' )[ 0 ] || null
				: null;

		var mainSwiperConfig = {
			observer: false,
			observeParents: false,
			observeSlideChildren: false,
			resizeObserver: true,
			crossFade: true,
			direction: readData( container, 'slider-orientation' ),
			effect:
				'carousel' === typeVal ? effectVal : slideshowEffectVal,
			coverflowEffect: {
				slideShadows: readData( container, 'slider-effect-shadows' ),
				rotate: readData( container, 'slider-effect-coverflow-rotate' ),
				depth: readData( container, 'slider-effect-coverflow-depth' ),
			},
			flipEffect: {
				rotate: 30,
				slideShadows: readData( container, 'slider-effect-shadows' ),
			},
			cubeEffect: {
				slideShadows: readData( container, 'slider-effect-shadows' ),
				shadow: readData( container, 'slider-effect-shadows' ),
				shadowOffset: 20,
				shadowScale: 0.94,
			},
			centeredSlides: isCentered,
			speed: parseInt(
				String( readData( container, 'speed' ) || '0' ),
				10
			),
			loop: isLoop,
			loopAddBlankSlides: false,
			mousewheel: readData( container, 'mousewheel' ),
			slidesPerView: slidesPerViewPhone,
			pagination: paginationEl
				? {
					el: paginationEl,
					type: 'bullets',
					clickable: true,
				}
				: false,
			navigation: {
				nextEl: nextNavButton || undefined,
				prevEl: prevNavButton || undefined,
			},
			autoplay: {
				enabled: false,
				delay: isInfiniteScrolling
					? 0
					: autoplaySpeed + titleOutPadMs,
				disableOnInteraction: false,
			},
			grabCursor:
				false === readData( container, 'touch-move' )
					? false
					: readData( container, 'grab' ),
			lazyPreloadPrevNext: lazyOn ? 2 : 0,
			allowTouchMove: readData( container, 'touch-move' ),
			a11y: {
				enabled: false,
				slideRole: 'group',
			},
			breakpoints: {
				981: dsmIcBreakpointParams(
					slidesPerViewDesktop,
					slidesPerGroupDesktop,
					spaceDesktop,
					slideRowDesktop
				),
				768: dsmIcBreakpointParams(
					slidesPerViewTablet,
					slidesPerGroupTablet,
					spaceTablet,
					slideRowTablet
				),
				480: dsmIcBreakpointParams(
					slidesPerViewPhone,
					slidesPerGroupPhone,
					spacePhone,
					slideRowPhone
				),
				320: dsmIcBreakpointParams(
					slidesPerViewPhone,
					slidesPerGroupPhone,
					spacePhone,
					slideRowPhone
				),
			},
		};

		if ( slideShowSwiper ) {
			mainSwiperConfig.thumbs = {
				swiper: slideShowSwiper,
			};
		}

		var ImageCarouselSwiper = new window.Swiper(
			container,
			mainSwiperConfig
		);

		var captionOutSlidePatchActive =
			'slideshow' === typeVal &&
			dsmIcTheoreticalCaptionOutPadMs( container ) > 0;

		if ( captionOutSlidePatchActive ) {
			var innerSlideToIc = ImageCarouselSwiper.slideTo.bind(
				ImageCarouselSwiper
			);
			ImageCarouselSwiper.slideTo = function (
				index,
				speed,
				runCallbacks,
				internal,
				initial
			) {
				var sw = this;
				if ( initial ) {
					return innerSlideToIc(
						index,
						speed,
						runCallbacks,
						internal,
						initial
					);
				}
				var speedForBypass = speed;
				if ( typeof speedForBypass === 'undefined' ) {
					speedForBypass = sw.params.speed;
				}
				if (
					internal &&
					Number( speedForBypass ) === 0 &&
					runCallbacks === false
				) {
					return innerSlideToIc(
						index,
						speed,
						runCallbacks,
						internal,
						initial
					);
				}
				if ( st.dsmIcTitleOutBusy ) {
					return undefined;
				}
				var tgtSlide = sw.slides[ index ];
				var tgtRi = tgtSlide
					? parseInt(
							tgtSlide.getAttribute( 'data-swiper-slide-index' ) ||
								String( index ),
							10
					  )
					: index;
				if ( tgtRi === sw.realIndex ) {
					return innerSlideToIc(
						index,
						speed,
						runCallbacks,
						internal,
						initial
					);
				}
				var fromSlideIc = sw.slides[ sw.activeIndex ];
				var wrapOutEl = fromSlideIc
					? fromSlideIc.querySelector(
							'.dsm_image_carousel_slideshow_content'
					  )
					: null;
				var titleOutEl = fromSlideIc
					? fromSlideIc.querySelector(
							'.dsm_image_carousel_slide_title'
					  )
					: null;
				var descOutEl = fromSlideIc
					? fromSlideIc.querySelector(
							'.dsm_image_carousel_slide_description'
					  )
					: null;

				var waitOutMs = dsmIcLiveCaptionOutMsFromSlide(
					fromSlideIc,
					container
				);
				if ( waitOutMs <= 0 ) {
					return innerSlideToIc(
						index,
						speed,
						runCallbacks,
						internal,
						initial
					);
				}

				var showTitle =
					readData( container, 'slideshow-show-slide-title' ) === true;
				var showDesc =
					readData( container, 'slideshow-show-slide-description' ) ===
					true;

				var animOutTitle = readData(
					container,
					'slideshow-title-animation-out'
				);
				if (
					showTitle &&
					( animOutTitle === undefined ||
						animOutTitle === null ||
						animOutTitle === '' )
				) {
					animOutTitle = 'fadeOutDown';
				}

				var animOutDesc = readData(
					container,
					'slideshow-description-animation-out'
				);
				if (
					showDesc &&
					( animOutDesc === undefined ||
						animOutDesc === null ||
						animOutDesc === '' )
				) {
					animOutDesc = 'fadeOutDown';
				}

				var animOutWrap = readData(
					container,
					'slideshow-wrapper-animation-out'
				);

				st.dsmIcTitleOutBusy = true;

				var doWrapOut =
					wrapOutEl &&
					animOutWrap &&
					animOutWrap !== 'none' &&
					( showTitle || showDesc );
				var doTitleOut =
					showTitle &&
					titleOutEl &&
					animOutTitle &&
					animOutTitle !== 'none';
				var doDescOut =
					showDesc &&
					descOutEl &&
					animOutDesc &&
					animOutDesc !== 'none';

				if ( doWrapOut ) {
					dsmIcStripAnimateCssClasses( wrapOutEl );
				}
				if ( doTitleOut ) {
					dsmIcStripAnimateCssClasses( titleOutEl );
				}
				if ( doDescOut ) {
					dsmIcStripAnimateCssClasses( descOutEl );
				}

				if ( doWrapOut ) {
					var wodu = dsmIcNormalizeCssAnimationTime(
						readData(
							container,
							'slideshow-wrapper-animation-out-duration'
						),
						'1000'
					);
					var wodl = dsmIcNormalizeCssAnimationTime(
						readData(
							container,
							'slideshow-wrapper-animation-out-delay'
						),
						'0'
					);
					void wrapOutEl.offsetWidth;
					wrapOutEl.style.animationDuration = String( wodu );
					wrapOutEl.style.animationDelay = String( wodl );
					wrapOutEl.classList.add( 'animated', animOutWrap );
				}
				if ( doTitleOut ) {
					var oduIc = dsmIcNormalizeCssAnimationTime(
						readData(
							container,
							'slideshow-title-animation-out-duration'
						),
						'1000'
					);
					var odlIc = dsmIcNormalizeCssAnimationTime(
						readData(
							container,
							'slideshow-title-animation-out-delay'
						),
						'0'
					);
					void titleOutEl.offsetWidth;
					titleOutEl.style.animationDuration = String( oduIc );
					titleOutEl.style.animationDelay = String( odlIc );
					titleOutEl.classList.add( 'animated', animOutTitle );
				}
				if ( doDescOut ) {
					var dduO = dsmIcNormalizeCssAnimationTime(
						readData(
							container,
							'slideshow-description-animation-out-duration'
						),
						'1000'
					);
					var ddlO = dsmIcNormalizeCssAnimationTime(
						readData(
							container,
							'slideshow-description-animation-out-delay'
						),
						'0'
					);
					void descOutEl.offsetWidth;
					descOutEl.style.animationDuration = String( dduO );
					descOutEl.style.animationDelay = String( ddlO );
					descOutEl.classList.add( 'animated', animOutDesc );
				}

				if ( st.dsmIcTitleOutTimerId ) {
					window.clearTimeout( st.dsmIcTitleOutTimerId );
				}
				st.dsmIcTitleOutTimerId = window.setTimeout( function () {
					st.dsmIcTitleOutTimerId = null;
					st.dsmIcTitleOutBusy = false;
					innerSlideToIc(
						index,
						speed,
						runCallbacks,
						internal,
						initial
					);
				}, waitOutMs );
				return undefined;
			};
		}

		/**
		 * Replay Animate.css on slideshow caption wrapper, title, and description (slideshow + options).
		 *
		 * @param {Element} swiperHost `.dsm_image_carousel_container`
		 * @param {*} swiperInstance Main Swiper instance
		 */
		function dsmIcApplySlideCaptionAnimations( swiperHost, swiperInstance ) {
			if ( readData( swiperHost, 'type' ) !== 'slideshow' ) {
				return;
			}
			var showTitle =
				readData( swiperHost, 'slideshow-show-slide-title' ) === true;
			var showDesc =
				readData( swiperHost, 'slideshow-show-slide-description' ) ===
				true;
			var root = swiperHost.closest( IC_ROOT_SEL );
			if ( ! root ) {
				root = swiperHost.parentElement;
			}
			if ( ! root ) {
				return;
			}

			var contents = root.querySelectorAll(
				'.dsm_image_carousel_slideshow_content'
			);
			var titles = root.querySelectorAll( '.dsm_image_carousel_slide_title' );
			var descs = root.querySelectorAll(
				'.dsm_image_carousel_slide_description'
			);
			Array.prototype.forEach.call( contents, function ( el ) {
				dsmIcStripAnimateCssClasses( el );
			} );
			Array.prototype.forEach.call( titles, function ( el ) {
				dsmIcStripAnimateCssClasses( el );
			} );
			Array.prototype.forEach.call( descs, function ( el ) {
				dsmIcStripAnimateCssClasses( el );
			} );

			var slide = swiperInstance.slides[ swiperInstance.activeIndex ];
			if ( ! slide ) {
				return;
			}
			var wrapEl = slide.querySelector(
				'.dsm_image_carousel_slideshow_content'
			);
			var activeTitle = slide.querySelector(
				'.dsm_image_carousel_slide_title'
			);
			var activeDesc = slide.querySelector(
				'.dsm_image_carousel_slide_description'
			);

			var wrapAnimIn = readData(
				swiperHost,
				'slideshow-wrapper-animation-in'
			);
			if (
				wrapEl &&
				wrapAnimIn &&
				wrapAnimIn !== 'none' &&
				( showTitle || showDesc )
			) {
				var wDur = dsmIcNormalizeCssAnimationTime(
					readData(
						swiperHost,
						'slideshow-wrapper-animation-in-duration'
					),
					'1000'
				);
				var wDel = dsmIcNormalizeCssAnimationTime(
					readData(
						swiperHost,
						'slideshow-wrapper-animation-in-delay'
					),
					'0'
				);
				void wrapEl.offsetWidth;
				wrapEl.style.animationDuration = String( wDur );
				wrapEl.style.animationDelay = String( wDel );
				wrapEl.classList.add( 'animated', wrapAnimIn );
			}

			if ( showTitle && activeTitle ) {
				var anim = readData( swiperHost, 'slideshow-title-animation' );
				if ( anim === undefined || anim === null || anim === '' ) {
					anim = 'fadeInUp';
				}
				if ( anim !== 'none' ) {
					var durRaw = readData(
						swiperHost,
						'slideshow-title-animation-duration'
					);
					var delRaw = readData(
						swiperHost,
						'slideshow-title-animation-delay'
					);
					var dur = dsmIcNormalizeCssAnimationTime( durRaw, '1000' );
					var del = dsmIcNormalizeCssAnimationTime( delRaw, '0' );
					void activeTitle.offsetWidth;
					activeTitle.style.animationDuration = String( dur );
					activeTitle.style.animationDelay = String( del );
					activeTitle.classList.add( 'animated', anim );
				}
			}

			if ( showDesc && activeDesc ) {
				var dAnim = readData(
					swiperHost,
					'slideshow-description-animation'
				);
				if ( dAnim === undefined || dAnim === null || dAnim === '' ) {
					dAnim = 'fadeInUp';
				}
				if ( dAnim !== 'none' ) {
					var dDur = dsmIcNormalizeCssAnimationTime(
						readData(
							swiperHost,
							'slideshow-description-animation-duration'
						),
						'1000'
					);
					var dDel = dsmIcNormalizeCssAnimationTime(
						readData(
							swiperHost,
							'slideshow-description-animation-delay'
						),
						'0'
					);
					void activeDesc.offsetWidth;
					activeDesc.style.animationDuration = String( dDur );
					activeDesc.style.animationDelay = String( dDel );
					activeDesc.classList.add( 'animated', dAnim );
				}
			}
		}

		ImageCarouselSwiper.on( 'slideChangeTransitionEnd', function () {
			dsmIcApplySlideCaptionAnimations( container, ImageCarouselSwiper );
		} );
		dsmIcApplySlideCaptionAnimations( container, ImageCarouselSwiper );

		st.dsmIcMainSwiper = ImageCarouselSwiper;
		st.dsmIcThumbSwiper = slideShowSwiper || null;

		if ( lazyOn ) {
			var dsmIcRoot = container.closest( '.dsm_image_carousel' );
			if ( ! dsmIcRoot ) {
				dsmIcRoot = container.parentElement;
			}
			if ( dsmIcRoot ) {
				dsmIcObserveLazyBackgrounds( dsmIcRoot );
			}
		}

		if ( readData( container, 'pause-on-hover' ) === true ) {
			if ( st._pauseEnter ) {
				container.removeEventListener( 'mouseenter', st._pauseEnter );
				container.removeEventListener( 'mouseleave', st._pauseLeave );
			}
			st._pauseEnter = function () {
				stopCarouselAutoplay( st.dsmIcMainSwiper );
			};
			st._pauseLeave = function () {
				startCarouselAutoplay( st.dsmIcMainSwiper );
			};
			container.addEventListener( 'mouseenter', st._pauseEnter );
			container.addEventListener( 'mouseleave', st._pauseLeave );
		}

		if ( container.closest( '.et_pb_tabs' ) ) {
			var tabLinks = document.querySelectorAll( '.et_pb_tabs a' );
			Array.prototype.forEach.call( tabLinks, function ( a ) {
				a.addEventListener( 'click', function icTabClick() {
					var sw = st.dsmIcMainSwiper;
					if ( sw && typeof sw.slideTo === 'function' ) {
						sw.slideTo( sw.realIndex, 0 );
					}
				} );
			} );
		}

		if ( readData( container, 'autoplay' ) === true ) {
			destroyCarouselAutoplayWaypoint( st );

			if ( typeof window.Waypoint === 'undefined' ) {
				startCarouselAutoplay( ImageCarouselSwiper );
			} else {
				st.dsmIcAutoplayWaypoint = new window.Waypoint( {
					element: container,
					handler: function () {
						startCarouselAutoplay( st.dsmIcMainSwiper );
						this.destroy();
						st.dsmIcAutoplayWaypoint = null;
					},
					offset: readData( container, 'autoplay-viewport' ),
				} );
			}
		}
	}

	function startCarouselAutoplay( swiper ) {
		if (
			! swiper ||
			! swiper.autoplay ||
			typeof swiper.autoplay.start !== 'function'
		) {
			return;
		}

		swiper.autoplay.start();
	}

	function stopCarouselAutoplay( swiper ) {
		if (
			! swiper ||
			! swiper.autoplay ||
			typeof swiper.autoplay.stop !== 'function'
		) {
			return;
		}

		swiper.autoplay.stop();
	}

	function destroyCarouselAutoplayWaypoint( st ) {
		if (
			st.dsmIcAutoplayWaypoint &&
			typeof st.dsmIcAutoplayWaypoint.destroy === 'function'
		) {
			st.dsmIcAutoplayWaypoint.destroy();
		}
		st.dsmIcAutoplayWaypoint = null;
	}

	function destroyCarouselInstance( container, st ) {
		if ( ! st ) {
			st = icGet( container );
		}

		if ( st.dsmIcTitleOutTimerId ) {
			window.clearTimeout( st.dsmIcTitleOutTimerId );
			st.dsmIcTitleOutTimerId = null;
		}
		st.dsmIcTitleOutBusy = false;

		destroyCarouselAutoplayWaypoint( st );

		var thumbSw = st.dsmIcThumbSwiper;
		var mainSw = st.dsmIcMainSwiper;

		if ( thumbSw && typeof thumbSw.destroy === 'function' ) {
			thumbSw.destroy( true, true );
		}
		if ( mainSw && typeof mainSw.destroy === 'function' ) {
			mainSw.destroy( true, true );
		}

		st.dsmIcMainSwiper = null;
		st.dsmIcThumbSwiper = null;
	}

	function refreshOrInitCarouselsInRoot( root ) {
		if ( ! root || typeof root.querySelectorAll !== 'function' ) {
			return;
		}

		var containers = root.querySelectorAll( IC_SEL );
		if ( ! containers.length ) {
			return;
		}

		bindLightboxForContainers( containers );

		Array.prototype.forEach.call( containers, function ( c ) {
			var st = icGet( c );

			if ( st.dsmIcMainSwiper ) {
				destroyCarouselInstance( c, st );
			}

			initCarouselInstance( c );
		} );
	}

	function run() {
		refreshOrInitCarouselsInRoot( document );

		window.addEventListener(
			'resize',
			dsmIcDebouncedResize( function () {
				var all = document.querySelectorAll( IC_SEL );
				Array.prototype.forEach.call( all, function ( c ) {
					var st = icGet( c );
					var payload = st.dsmIcPayload;
					if ( ! payload ) {
						return;
					}
					var bp = dsmIcGetGalleryBreakpoint();
					if ( bp === st.dsmIcCurrentBp ) {
						return;
					}
					var thumbSw = st.dsmIcThumbSwiper;
					var mainSw = st.dsmIcMainSwiper;
					if ( st.dsmIcTitleOutTimerId ) {
						window.clearTimeout( st.dsmIcTitleOutTimerId );
						st.dsmIcTitleOutTimerId = null;
					}
					st.dsmIcTitleOutBusy = false;
					if ( thumbSw && typeof thumbSw.destroy === 'function' ) {
						thumbSw.destroy( true, true );
					}
					if ( mainSw && typeof mainSw.destroy === 'function' ) {
						mainSw.destroy( true, true );
					}
					dsmIcApplyResponsiveGallery( c, payload );
					st.dsmIcCurrentBp = bp;
					initCarouselInstance( c, { skipApply: true } );
				} );
			}, 150 )
		);
	}

	window.dsmReinitImageCarouselsInRoot = refreshOrInitCarouselsInRoot;

	[ 'dsm:reinit-library-modules-in-root', 'dsm:reinit-carousels-in-root' ].forEach(
		function ( eventName ) {
			window.addEventListener( eventName, function ( event ) {
				var root = event && event.detail ? event.detail.root : null;
				if ( ! root || typeof root.querySelector !== 'function' ) {
					return;
				}
				if ( ! root.querySelector( IC_ROOT_SEL ) ) {
					return;
				}
				refreshOrInitCarouselsInRoot( root );
			} );
		}
	);

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', run );
	} else {
		run();
	}
} )();
