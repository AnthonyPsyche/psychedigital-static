/**
 * Blog Carousel frontend (`dsm/blog-carousel`).
 */
( function () {
	'use strict';

	if ( typeof window.dsmRegisterPostBlogCarouselModule !== 'function' ) {
		return;
	}

	window.dsmRegisterPostBlogCarouselModule( {
		rootSelector: '.dsm_blog_carousel',
		carouselRootSelector: '.dsm-blog-carousel',
		containerSelector: '.swiper-container.dsm-blog-carousel-container',
		slideClass: 'dsm-blog-carousel-item',
		wrapperClass: 'dsm-blog-carousel-wrapper',
		reinitGlobalName: 'dsmReinitBlogCarouselsInRoot',
	} );
} )();
