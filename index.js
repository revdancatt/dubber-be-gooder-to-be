/* global preloadImagesTmr location fxpreview fxhash fxrand Image palettes StackBlur */
//
//
//  fxhash - Dubber Be Gooder To Me
//
//
//  HELLO!! Code is copyright revdancatt (that's me), so no sneaky using it for your
//  NFT projects.
//  But please feel free to unpick it, and ask me questions. A quick note, this is written
//  as an artist, which is a slightly different (and more storytelling way) of writing
//  code, than if this was an engineering project. I've tried to keep it somewhat readable
//  rather than doing clever shortcuts, that are cool, but harder for people to understand.
//
//  You can find me at...
//  https://twitter.com/revdancatt
//  https://instagram.com/revdancatt
//  https://youtube.com/revdancatt
//

const ratio = 1
// const startTime = new Date().getTime() // so we can figure out how long since the scene started
let drawn = false
let highRes = false // display high or low res
const features = {}
const nextFrame = null
let resizeTmr = null
let imageLoadingSetup = false
let triggered = false
/* eslint-disable */
let sourceImagesLoaded = []
/* eslint-enable */
const textures = []
const dumpOutputs = false

window.$fxhashFeatures = {}

//  Work out what all our features are
const makeFeatures = () => {
  // Now we pick a number of rows, something between 6 and 18
  features.rows = Math.floor((Math.floor(fxrand() * 6) + 4) / 2) * 2

  features.rowHeight = 1 / features.rows
  //  If we know the row height, that's the height we'll use for an equalateral triangle, so we need to work out the width
  features.triangleWidth = features.rowHeight / (Math.sqrt(3) / 2)
  //  Now we need to work out how many triangles we can fit in a row
  features.trianglesPerRow = Math.ceil(1 / features.triangleWidth) * 2

  features.landscape1Index = Math.floor(fxrand() * 24).toString().padStart(2, '0')
  features.landscape2Index = Math.floor(fxrand() * 24).toString().padStart(2, '0')
  features.foregroundIndex = Math.floor(fxrand() * 24).toString().padStart(2, '0')
  features.lightIndex = Math.floor(fxrand() * 7 + 1).toString().padStart(2, '0')

  let swapLandscape = false
  let swapForeground = false
  // Sometimes we'll swap things
  if (fxrand() < 0.20) swapLandscape = true
  if (fxrand() < 0.14) swapForeground = true

  features.showLight = fxrand() < 0.666

  // This holds the images we are going to load
  features.sourceArray = []

  // This is the inside image
  let pushThis = {
    type: 'landscape1',
    index: features.landscape1Index,
    swaps: []
  }
  // Now we need to work out where we are going to swap the images from and to
  let swapChance = 0.2
  if (swapForeground) swapChance = 0.3
  for (let i = 0; i < features.rows; i++) {
    for (let j = 0; j < features.trianglesPerRow; j++) {
      // There is a chance we care going to swap into this spot
      if (fxrand() < swapChance) {
        const toIndex = `${i}-${j}`
        // Now grab somewhere to swap from
        const fromIndex = `${Math.floor(fxrand() * features.rows)}-${Math.floor(fxrand() * (features.trianglesPerRow - 4) + 2)}`
        pushThis.swaps.push({
          from: fromIndex,
          to: toIndex
        })
      }
    }
  }
  features.sourceArray.push(pushThis)

  // This is the outside image
  pushThis = {
    type: 'landscape2',
    index: features.landscape2Index,
    swaps: []
  }
  // Now we need to work out where we are going to swap the images from and to
  swapChance = 0.3
  for (let i = 0; i < features.rows; i++) {
    for (let j = 0; j < features.trianglesPerRow; j++) {
      // There is a chance we care going to swap into this spot
      if (fxrand() < swapChance) {
        const toIndex = `${i}-${j}`
        // Now grab somewhere to swap from
        const fromIndex = `${Math.floor(fxrand() * features.rows)}-${Math.floor(fxrand() * (features.trianglesPerRow - 4) + 2)}`
        pushThis.swaps.push({
          from: fromIndex,
          to: toIndex
        })
      }
    }
  }
  features.sourceArray.push(pushThis)

  // Now add the foreground
  pushThis = {
    type: 'foreground',
    index: features.foregroundIndex,
    swaps: []
  }
  features.finalLayerMap = {}
  // For this we are going to do things slightly differently, we want to shuffle x% of the triangles around
  for (let i = 0; i < features.rows; i++) {
    const swapChance = i / features.rows
    for (let j = 0; j < features.trianglesPerRow; j++) {
      // There is a chance we care going to swap into this spot
      if (fxrand() < swapChance) {
        const toIndex = `${i}-${j}`
        // Now grab somewhere to swap from
        const triforce = fxrand() < 0.2
        features.finalLayerMap[toIndex] = triforce
        const y = Math.floor(features.rows - Math.abs(((fxrand() * features.rows) + (fxrand() * features.rows)) - features.rows))
        const fromIndex = `${y}-${Math.floor(fxrand() * (features.trianglesPerRow - 4) + 2)}`
        pushThis.swaps.push({
          from: fromIndex,
          to: toIndex,
          triforce
        })
      }
    }
  }
  features.sourceArray.push(pushThis)

  // Sometimes we'll swap the inside and outside
  if (swapLandscape) {
    features.sourceArray[0].type = 'landscape2'
    features.sourceArray[1].type = 'landscape1'
  }

  // Sometimes we'll set the first entry to be a face too
  if (swapForeground) {
    features.sourceArray[0].type = 'foreground'
    features.sourceArray[2].type = 'landscape1'
  }

  if (swapLandscape && swapForeground) {
    features.sourceArray[0].type = 'foreground'
    features.sourceArray[2].type = 'landscape2'
  }

  // Now pick a random palette
  features.palette = palettes[Math.floor(fxrand() * palettes.length)]
  // Now we want to pick 20% of the triangles to colourise
  features.colourise = []
  const indexesPicked = []
  let subset3Mod = 0.333
  if (features.colourful) subset3Mod = 1
  const subset3 = features.rows * features.trianglesPerRow * subset3Mod
  while (indexesPicked.length < subset3) {
    const index = `${Math.floor(fxrand() * features.rows)}-${Math.floor(fxrand() * features.trianglesPerRow)}`
    if (indexesPicked.includes(index)) continue
    features.colourise.push({
      index,
      colour: features.palette.colors[Math.floor(fxrand() * features.palette.colors.length)].value,
      mode: 'transparent'
    })
    indexesPicked.push(index)
  }

  // We want 10,000 random points
  features.noisePoints = []
  for (let i = 0; i < 500000; i++) {
    features.noisePoints.push({
      x: fxrand(),
      y: fxrand(),
      shade: fxrand() < 0.5 ? 255 : 0
    })
  }

  features.circles = null
  features.squares = null
  features.circleSteps = 14
  features.startRadius = 0.43
  features.angleMod = 1
  if (fxrand() < 0.25) {
    features.circles = 'small'
    if (fxrand() < 0.6) {
      features.circles = '180'
      if (fxrand() < 0.4) {
        features.circleSteps = 50
        features.startRadius = 0.48
      }
    }
  }
  if (!features.circles) {
    if (fxrand() < 0.25) {
      features.squares = true
      features.startRadius = 0.48
      if (fxrand() < 0.333) features.angleMod = 0.05
    }
  }
  features.coverTop = fxrand() < 0.75

  window.$fxhashFeatures.density = features.rows * features.trianglesPerRow
  window.$fxhashFeatures.landscape1 = features.landscape1Index
  window.$fxhashFeatures.landscape2 = features.landscape2Index
  window.$fxhashFeatures.foreground = features.foregroundIndex
  window.$fxhashFeatures.Lights = 'None'
  if (features.showLight) window.$fxhashFeatures.Lights = features.lightIndex

  window.$fxhashFeatures.palette = features.palette.name
  window.$fxhashFeatures.Background = 'Landscape1'
  if (swapLandscape) window.$fxhashFeatures.Background = 'Landscape2'
  if (swapForeground) window.$fxhashFeatures.Background = 'Forground'
  window.$fxhashFeatures.Composition = 'Triangles'
  if (features.circles) {
    window.$fxhashFeatures.Composition = 'Circles'
    if (features.coverTop) window.$fxhashFeatures.Composition = 'Half circles'
  }
  if (features.squares) {
    window.$fxhashFeatures.Composition = 'Squares'
    if (features.coverTop) window.$fxhashFeatures.Composition = 'Half squares'
  }
}

//  Call the above make features, so we'll have the window.$fxhashFeatures available
//  for fxhash
makeFeatures()
console.log(features)
console.table(window.$fxhashFeatures)

const init = async () => {
  //  I should add a timer to this, but really how often to people who aren't
  //  the developer resize stuff all the time. Stick it in a digital frame and
  //  have done with it!
  window.addEventListener('resize', async () => {
    clearTimeout(resizeTmr)
    resizeTmr = setTimeout(layoutCanvas, 100)
  })

  //  Now layout the canvas
  await layoutCanvas()
}

const layoutCanvas = async () => {
  //  Kill the next animation frame
  window.cancelAnimationFrame(nextFrame)

  const wWidth = window.innerWidth
  const wHeight = window.innerHeight
  let cWidth = wWidth
  let cHeight = cWidth * ratio
  if (cHeight > wHeight) {
    cHeight = wHeight
    cWidth = wHeight / ratio
  }
  const canvas = document.getElementById('target')
  if (highRes) {
    canvas.height = 8192
    canvas.width = 8192 / ratio
  } else {
    canvas.width = Math.min((8192 / 2), cWidth * 2)
    canvas.height = Math.min((8192 / ratio / 2), cHeight * 2)
    //  Minimum size to be half of the high rez cersion
    if (Math.min(canvas.width, canvas.height) < 8192 / 2) {
      if (canvas.width < canvas.height) {
        canvas.height = 8192 / 2
        canvas.width = 8192 / 2 / ratio
      } else {
        canvas.width = 8192 / 2
        canvas.height = 8192 / 2 / ratio
      }
    }
  }

  // Adjust it to fit the rows better
  const newHeight = Math.floor(canvas.height / features.rows) * features.rows
  canvas.height = newHeight
  canvas.width = newHeight / ratio

  canvas.style.position = 'absolute'
  canvas.style.width = `${cWidth}px`
  canvas.style.height = `${cHeight}px`
  canvas.style.left = `${(wWidth - cWidth) / 2}px`
  canvas.style.top = `${(wHeight - cHeight) / 2}px`

  //  And draw it!!
  drawCanvas()
}

const drawCanvas = async () => {
  //  Let the preloader know that we've hit this function at least once
  drawn = true
  //  Make sure there's only one nextFrame to be called
  window.cancelAnimationFrame(nextFrame)

  // Grab all the canvas stuff
  const canvas = document.getElementById('target')
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  //  Draw the outline, DEBUG
  /*
  ctx.strokeStyle = '#cccccc'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.rect(0, 0, w, h)
  ctx.stroke()
  */

  // Copy the first image from the texture array to the canvas filling it
  ctx.drawImage(textures[0], 0, 0, w, h)

  // More debug
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = w / 400

  // Build a map of all the triangles we need to draw, recording all the positions
  // so we can run through it later
  const triangleMap = {}

  const xOffset = (w - (features.triangleWidth * w * features.trianglesPerRow / 2)) / 2
  for (let i = 0; i < features.rows; i++) {
    //  Work out the y position of the row
    const y = i * features.rowHeight * h
    // we need to work out an x offset for the row so the triangles are centered in the middle

    for (let j = 0; j < features.trianglesPerRow; j++) {
      const index = `${i}-${j}`

      //  Work out the x position of the triangle
      const x = j * features.triangleWidth * w / 2

      let flipped = false
      // if j is odd, flip the triangle
      if (j % 2 === 1) {
        flipped = true
      }
      // If i is odd, flip the triangle
      if (i % 2 === 1) {
        flipped = !flipped
      }

      // Work out the bounding box of the triangle
      const bbox = {
        x: x + xOffset,
        y,
        width: features.triangleWidth * w,
        height: features.rowHeight * h
      }

      const points = []
      // Work out the positions of the points of the triangle
      if (flipped) {
        points.push({ x: x + xOffset, y: y + features.rowHeight * h })
        points.push({ x: x + features.triangleWidth * w / 2 + xOffset, y })
        points.push({ x: x + features.triangleWidth * w + xOffset, y: y + features.rowHeight * h })
      } else {
        points.push({ x: x + xOffset, y })
        points.push({ x: x + features.triangleWidth * w / 2 + xOffset, y: y + features.rowHeight * h })
        points.push({ x: x + features.triangleWidth * w + xOffset, y })
      }
      triangleMap[index] = {
        bbox,
        points,
        flipped
      }
    }
  }

  let demoCounter = 0
  for (let sourceId = 0; sourceId < features.sourceArray.length + 1; sourceId++) {
    let drawLayer = sourceId
    demoCounter++
    if (demoCounter > 4) continue
    if (demoCounter === 4) drawLayer = 2
    if (features.sourceArray[drawLayer].swaps) {
      features.sourceArray[drawLayer].swaps.forEach((item, index) => {
        const fromTriangle = triangleMap[item.from]
        const toTriangle = triangleMap[item.to]
        // Mask the area we are going to draw into
        if (demoCounter === 3) {
          ctx.save()
          ctx.translate(w / features.rows / 12, h / features.rows / 12)
        }
        ctx.save()
        ctx.beginPath()
        if (item.triforce) {
          const midPoint1 = {
            x: (toTriangle.points[0].x + toTriangle.points[1].x) / 2,
            y: (toTriangle.points[0].y + toTriangle.points[1].y) / 2
          }
          const midPoint2 = {
            x: (toTriangle.points[1].x + toTriangle.points[2].x) / 2,
            y: (toTriangle.points[1].y + toTriangle.points[2].y) / 2
          }
          const midPoint3 = {
            x: (toTriangle.points[2].x + toTriangle.points[0].x) / 2,
            y: (toTriangle.points[2].y + toTriangle.points[0].y) / 2
          }
          // First triangle
          ctx.moveTo(toTriangle.points[0].x, toTriangle.points[0].y)
          ctx.lineTo(midPoint1.x, midPoint1.y)
          ctx.lineTo(midPoint3.x, midPoint3.y)
          ctx.lineTo(toTriangle.points[0].x, toTriangle.points[0].y)
          // Second trangle
          ctx.moveTo(midPoint1.x, midPoint1.y)
          ctx.lineTo(toTriangle.points[1].x, toTriangle.points[1].y)
          ctx.lineTo(midPoint2.x, midPoint2.y)
          ctx.lineTo(midPoint1.x, midPoint1.y)
          // Third triangle
          ctx.moveTo(midPoint3.x, midPoint3.y)
          ctx.lineTo(midPoint2.x, midPoint2.y)
          ctx.lineTo(toTriangle.points[2].x, toTriangle.points[2].y)
          ctx.lineTo(midPoint3.x, midPoint3.y)
        } else {
          ctx.moveTo(toTriangle.points[0].x, toTriangle.points[0].y)
          ctx.lineTo(toTriangle.points[1].x, toTriangle.points[1].y)
          ctx.lineTo(toTriangle.points[2].x, toTriangle.points[2].y)
          ctx.closePath()
        }
        ctx.clip()
        // Now draw the image from the texture[0] image to the canvas
        if (demoCounter === 3) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
          ctx.fillRect(toTriangle.bbox.x, toTriangle.bbox.y, toTriangle.bbox.width, toTriangle.bbox.height)
        } else {
          if (!toTriangle.flipped) {
            ctx.drawImage(textures[drawLayer], fromTriangle.bbox.x / w * textures[drawLayer].width, fromTriangle.bbox.y / h * textures[drawLayer].height, fromTriangle.bbox.width / w * textures[drawLayer].width, fromTriangle.bbox.height / h * textures[drawLayer].height, toTriangle.bbox.x, toTriangle.bbox.y, toTriangle.bbox.width, toTriangle.bbox.height)
          } else {
            ctx.save()
            ctx.scale(1, -1)
            ctx.drawImage(textures[drawLayer], fromTriangle.bbox.x / w * textures[drawLayer].width, fromTriangle.bbox.y / h * textures[drawLayer].height, fromTriangle.bbox.width / w * textures[drawLayer].width, fromTriangle.bbox.height / h * textures[drawLayer].height, toTriangle.bbox.x, -toTriangle.bbox.y, toTriangle.bbox.width, -toTriangle.bbox.height)
            ctx.restore()
          }
        }
        if (demoCounter === 3) ctx.restore()
        ctx.restore()
      })
    }
    if (demoCounter === 1) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.333)'
      ctx.fillRect(0, 0, w, h)
    }
    if (demoCounter === 1) StackBlur.canvasRGBA(canvas, 0, 0, w, h, w / 400)
    // if (demoCounter === 2) StackBlur.canvasRGBA(canvas, 0, 0, w, h, w / 500)
    if (demoCounter === 3) {
      StackBlur.canvasRGBA(canvas, 0, 0, w, h, w / 80)
      // Work out the offset
      const offset = w / 1500
      // Loop throught the noise points and add them
      for (let i = 0; i < features.noisePoints.length; i++) {
        ctx.fillStyle = `rgba(${features.noisePoints[i].shade},${features.noisePoints[i].shade},${features.noisePoints[i].shade},0.05)`
        ctx.fillRect((features.noisePoints[i].x * w) - offset, (features.noisePoints[i].y * h) - offset, offset * 2, offset * 2)
      }
    }
  }

  // Now we colourise the triangles
  features.colourise.forEach((item, index) => {
    const triangle = triangleMap[item.index]
    if (item.index in features.finalLayerMap) {
      // Mask the area we are going to draw into
      ctx.save()
      ctx.beginPath()
      if (features.finalLayerMap[item.index]) {
        // Calculate the midpoint of the triangle
        const midPoint1 = {
          x: (triangle.points[0].x + triangle.points[1].x) / 2,
          y: (triangle.points[0].y + triangle.points[1].y) / 2
        }
        const midPoint2 = {
          x: (triangle.points[1].x + triangle.points[2].x) / 2,
          y: (triangle.points[1].y + triangle.points[2].y) / 2
        }
        const midPoint3 = {
          x: (triangle.points[2].x + triangle.points[0].x) / 2,
          y: (triangle.points[2].y + triangle.points[0].y) / 2
        }
        // Draw the first triangle
        ctx.moveTo(triangle.points[0].x, triangle.points[0].y)
        ctx.lineTo(midPoint1.x, midPoint1.y)
        ctx.lineTo(midPoint3.x, midPoint3.y)
        ctx.lineTo(triangle.points[0].x, triangle.points[0].y)
        // Draw the second triangle
        ctx.moveTo(triangle.points[1].x, triangle.points[1].y)
        ctx.lineTo(midPoint1.x, midPoint1.y)
        ctx.lineTo(midPoint2.x, midPoint2.y)
        ctx.lineTo(triangle.points[1].x, triangle.points[1].y)
        // Draw the third triangle
        ctx.moveTo(triangle.points[2].x, triangle.points[2].y)
        ctx.lineTo(midPoint2.x, midPoint2.y)
        ctx.lineTo(midPoint3.x, midPoint3.y)
        ctx.lineTo(triangle.points[2].x, triangle.points[2].y)
      } else {
        ctx.moveTo(triangle.points[0].x, triangle.points[0].y)
        ctx.lineTo(triangle.points[1].x, triangle.points[1].y)
        ctx.lineTo(triangle.points[2].x, triangle.points[2].y)
        ctx.closePath()
      }
      ctx.clip()
      // set the fill colour
      ctx.fillStyle = item.colour
      if (item.mode === 'transparent') ctx.globalCompositeOperation = 'color'
      // Fill in the bounding box of the triangle
      ctx.fillRect(triangle.bbox.x, triangle.bbox.y, triangle.bbox.width, triangle.bbox.height)
      ctx.restore()
      ctx.globalCompositeOperation = 'source-over'
    }
  })

  // Final subtle blur
  StackBlur.canvasRGBA(canvas, 0, 0, w, h, w / 500)

  // Now copy the canvas to a new temp canvas
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = w
  tempCanvas.height = h
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.drawImage(canvas, 0, 0)

  if (features.circles || features.squares) {
    const startRadius = features.startRadius
    const endRadius = 0.0
    const startAngle = 180
    const steps = features.circleSteps
    let endAngle = 180 * (steps + 1)
    if (features.circles === 'small') {
      endAngle = 360
    }

    for (let i = 0; i < steps; i++) {
      const percent = i / steps
      const thisRadius = startRadius + (endRadius - startRadius) * percent
      let thisAngle = startAngle + (endAngle - startAngle) * percent

      // Now create a circle mask
      ctx.save()
      ctx.beginPath()
      if (features.squares) {
        // length of side = w * thisRadius
        const side = w * thisRadius * 1.75
        const border = (w - side) / 2
        ctx.rect(border, border, side, side)
        thisAngle *= features.angleMod
      } else {
        ctx.arc(w / 2, h / 2, w * thisRadius, 0, 2 * Math.PI)
      }
      ctx.clip()
      // Copy the temp canvas back into the main canvas, but rotated the canvas
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.rotate(thisAngle * Math.PI / 180)
      ctx.drawImage(tempCanvas, -w / 2, -h / 2)
      ctx.restore()
      ctx.restore()

      if (features.coverTop) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, w, h / 2)
        ctx.clip()
        ctx.drawImage(tempCanvas, 0, 0)
        ctx.restore()
      }
    }
  }

  // Now draw the light leak ontop
  if (features.showLight) {
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(textures[features.sourceArray.length], 0, 0, w, h)
    // reset the global composite operation
    ctx.globalCompositeOperation = 'source-over'
  }

  if (!triggered) {
    fxpreview()
  }

  triggered = true
  if (dumpOutputs) autoDownloadCanvas()
}

const autoDownloadCanvas = async (showHash = false) => {
  const element = document.createElement('a')
  element.setAttribute('download', `Dubber_Be_Gooder_To_Me_${fxhash}`)
  element.style.display = 'none'
  document.body.appendChild(element)
  let imageBlob = null
  imageBlob = await new Promise(resolve => document.getElementById('target').toBlob(resolve, 'image/png'))
  element.setAttribute('href', window.URL.createObjectURL(imageBlob, {
    type: 'image/png'
  }))
  element.click()
  document.body.removeChild(element)
  if (dumpOutputs) location.reload()
}

//  KEY PRESSED OF DOOM
document.addEventListener('keypress', async (e) => {
  e = e || window.event
  // Save
  if (e.key === 's') autoDownloadCanvas()

  //   Toggle highres mode
  if (e.key === 'h') {
    highRes = !highRes
    console.log(`Highres mode is now ${highRes}`)
    await layoutCanvas()
  }
})

//  This preloads the images so we can get access to them
// eslint-disable-next-line no-unused-vars
const preloadImages = () => {
  // We need to load in four images based on the features.textureArray, we need to
  // have a load event for each of them, and then we need to check if all four have
  // loaded before we kick off the init function by setting the textureXLoaded to true
  // for each one
  if (!imageLoadingSetup) {
    features.sourceArray.forEach((texture, index) => {
      sourceImagesLoaded[index] = false
      textures[index] = new Image()
      textures[index].onload = () => {
        // eslint-disable-next-line no-eval
        eval(`sourceImagesLoaded[${index}] = true`)
      }
      textures[index].src = `./source/${texture.type}/image${texture.index}.jpg`
    })
    // Add the light one
    const li = features.sourceArray.length
    sourceImagesLoaded[li] = false
    textures[li] = new Image()
    textures[li].onload = () => {
      // eslint-disable-next-line no-eval
      eval(`sourceImagesLoaded[${li}] = true`)
    }
    textures[li].src = `./source/light/image${features.lightIndex}.jpg`
  }
  imageLoadingSetup = true

  let allSourceImagesLoaded = true
  // Check to see if all the images have loaded
  sourceImagesLoaded.forEach((loaded) => {
    if (!loaded) allSourceImagesLoaded = false
  })

  //  If paper1 has loaded and we haven't draw anything yet, then kick it all off
  if (allSourceImagesLoaded && !drawn) {
    clearInterval(preloadImagesTmr)
    init()
  }
}
