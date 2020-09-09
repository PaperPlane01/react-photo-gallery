import React, { useState, useLayoutEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import ResizeObserver from 'resize-observer-polyfill';
import Photo, { photoPropType } from './Photo';
import { computeColumnLayout } from './layouts/columns';
import { computeRowLayout } from './layouts/justified';
import { findIdealNodeSearch } from './utils/findIdealNodeSearch';

const Gallery = React.memo(function Gallery({
  photos,
  onClick,
  direction,
  margin,
  limitNodeSearch,
  targetRowHeight,
  columns,
  renderImage,
  useParentContainerWidth,
  parentContainerWidth,
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const galleryEl = useRef(null);

  useLayoutEffect(() => {
    if (!useParentContainerWidth) {
      let animationFrameID = null;
      const observer = new ResizeObserver(entries => {
        // only do something if width changes
        const newWidth = entries[0].contentRect.width;
        if (containerWidth !== newWidth) {
          // put in an animation frame to stop "benign errors" from
          // ResizObserver https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
          animationFrameID = window.requestAnimationFrame(() => {
            setContainerWidth(Math.floor(newWidth));
          });
        }
      });
      observer.observe(galleryEl.current);
      return () => {
        observer.disconnect();
        window.cancelAnimationFrame(animationFrameID);
      };
    }
  });

  // Choose container width passed by user or use calculated container width
  const usedContainerWidth = useParentContainerWidth ? parentContainerWidth : containerWidth;

  const handleClick = (event, { index }) => {
    onClick(event, {
      index,
      photo: photos[index],
      previous: photos[index - 1] || null,
      next: photos[index + 1] || null,
    });
  };

  // no containerWidth until after first render with refs, skip calculations and render nothing
  if (!usedContainerWidth) return <div ref={galleryEl}>&nbsp;</div>;
  // subtract 1 pixel because the browser may round up a pixel
  const width = usedContainerWidth - 1;
  let galleryStyle, thumbs;

  if (direction === 'row') {
    // allow user to calculate limitNodeSearch from containerWidth
    if (typeof limitNodeSearch === 'function') {
      limitNodeSearch = limitNodeSearch(usedContainerWidth);
    }
    if (typeof targetRowHeight === 'function') {
      targetRowHeight = targetRowHeight(usedContainerWidth);
    }
    // set how many neighboring nodes the graph will visit
    if (limitNodeSearch === undefined) {
      limitNodeSearch = 2;
      if (containerWidth >= 450) {
        limitNodeSearch = findIdealNodeSearch({ containerWidth: usedContainerWidth, targetRowHeight });
      }
    }

    galleryStyle = { display: 'flex', flexWrap: 'wrap', flexDirection: 'row' };
    thumbs = computeRowLayout({ containerWidth: width, limitNodeSearch, targetRowHeight, margin, photos });
  }
  if (direction === 'column') {
    // allow user to calculate columns from containerWidth
    if (typeof columns === 'function') {
      columns = columns(usedContainerWidth);
    }
    // set default breakpoints if user doesn't specify columns prop
    if (columns === undefined) {
      columns = 1;
      if (usedContainerWidth >= 500) columns = 2;
      if (usedContainerWidth >= 900) columns = 3;
      if (usedContainerWidth >= 1500) columns = 4;
    }
    galleryStyle = { position: 'relative' };
    thumbs = computeColumnLayout({ containerWidth: width, columns, margin, photos });
    galleryStyle.height = thumbs[thumbs.length - 1].containerHeight;
  }

  const renderComponent = renderImage || Photo;
  return (
    <div className="react-photo-gallery--gallery">
      <div ref={galleryEl} style={galleryStyle}>
        {thumbs.map((thumb, index) => {
          const { left, top, containerHeight, ...photo } = thumb;
          return renderComponent({
            left,
            top,
            key: thumb.key || thumb.src,
            containerHeight,
            index,
            margin,
            direction,
            onClick: onClick ? handleClick : null,
            photo,
          });
        })}
      </div>
    </div>
  );
});

Gallery.propTypes = {
  photos: PropTypes.arrayOf(photoPropType).isRequired,
  direction: PropTypes.string,
  onClick: PropTypes.func,
  columns: PropTypes.oneOfType([PropTypes.func, PropTypes.number]),
  targetRowHeight: PropTypes.oneOfType([PropTypes.func, PropTypes.number]),
  limitNodeSearch: PropTypes.oneOfType([PropTypes.func, PropTypes.number]),
  margin: PropTypes.number,
  renderImage: PropTypes.func,
  usedParentContainerWidth: PropTypes.bool,
  parentContainerWidth: PropTypes.number,
};

Gallery.defaultProps = {
  margin: 2,
  direction: 'row',
  targetRowHeight: 300,
  usedParentContainerWidth: false,
  parentContainerWidth: undefined,
};
export { Photo };
export default Gallery;
