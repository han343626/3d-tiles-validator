import { GeneratorArgs } from './arguments';
import {
    east,
    gltfConversionOptions,
    latitude,
    longitude,
    north,
    outputDirectory,
    south,
    tilesNextTilesetJsonVersion,
    tileWidth,
    west,
    wgs84Transform
} from './constants';
import * as path from 'path';
import { TilesNextExtension } from './tilesNextExtension';
import { Gltf } from './gltfType';
import { writeTile } from './ioUtil';
import { TilesetJson } from './tilesetJson';
import { InstanceTileUtils } from './instanceUtilsNext';
import { addBinaryBuffers } from './gltfUtil';
import { createEXTMeshInstancingExtension } from './createEXTMeshInstancing';
import { getGltfFromGlbUri } from './gltfFromUri';
import { FeatureMetadata } from './featureMetadata';
import { BatchTable } from './createBuildingsTile';
import { Matrix4 } from 'cesium';

const getProperties = require('./getProperties');

const fsExtra = require('fs-extra');
const gltfPipeline = require('gltf-pipeline');
const glbToGltf = gltfPipeline.glbToGltf;
const saveJson  = require('./saveJson');

export namespace SamplesNext {
    export async function createDiscreteLOD(args: GeneratorArgs) {
        const ext = args.useGlb
            ? TilesNextExtension.Glb
            : TilesNextExtension.Gltf;

        const glbPaths = [
            'data/dragon_high.glb',
            'data/dragon_medium.glb',
            'data/dragon_low.glb'
        ];
        const tileNames = ['dragon_high', 'dragon_medium', 'dragon_low'];
        const tilesetName = 'TilesetWithDiscreteLOD';
        const tilesetDirectory = path.join(
            outputDirectory,
            'Samples',
            tilesetName
        );
        const tilesetPath = path.join(tilesetDirectory, 'tileset.json');

        const dragonWidth = 14.191;
        const dragonHeight = 10.075;
        const dragonDepth = 6.281;
        const dragonBox = [
            0.0,
            0.0,
            0.0, // center
            dragonWidth / 2.0,
            0.0,
            0.0, // width
            0.0,
            dragonDepth / 2.0,
            0.0, // depth
            0.0,
            0.0,
            dragonHeight / 2.0 // height
        ];

        const dragonScale = 100.0;
        const dragonOffset = (dragonHeight / 2.0) * dragonScale;
        const wgs84Matrix = wgs84Transform(longitude, latitude, dragonOffset);
        const scaleMatrix = Matrix4.fromUniformScale(dragonScale);
        const dragonMatrix = Matrix4.multiply(
            wgs84Matrix,
            scaleMatrix,
            new Matrix4()
        );
        const dragonTransform = Matrix4.pack(dragonMatrix, new Array(16));

        // At runtime a tile's geometric error is scaled by its computed scale.
        // This doesn't apply to the top-level geometric error.
        const dragonLowGeometricError = 5.0;
        const dragonMediumGeometricError = 1.0;
        const dragonHighGeometricError = 0.1;
        const dragonTilesetGeometricError =
            dragonLowGeometricError * dragonScale;

        const tilesetJson = {
            asset: {
                version: tilesNextTilesetJsonVersion
            },
            geometricError: dragonTilesetGeometricError,
            root: {
                transform: dragonTransform,
                boundingVolume: {
                    box: dragonBox
                },
                geometricError: dragonMediumGeometricError,
                refine: 'REPLACE',
                content: {
                    uri: 'dragon_low' + ext
                },
                children: [
                    {
                        boundingVolume: {
                            box: dragonBox
                        },
                        geometricError: dragonHighGeometricError,
                        content: {
                            uri: 'dragon_medium' + ext
                        },
                        children: [
                            {
                                boundingVolume: {
                                    box: dragonBox
                                },
                                geometricError: 0.0,
                                content: {
                                    uri: 'dragon_high' + ext
                                }
                            }
                        ]
                    }
                ]
            }
        };

        const gltfs: Gltf[] = [];
        for (let i=0; i < glbPaths.length; ++i) {
            const glbPath = glbPaths[i];
            const glb = await fsExtra.readFile(glbPath);
            const gltf = (await glbToGltf(glb)).gltf as Gltf;
            gltfs.push(gltf);
        }

        await saveJson(tilesetPath, tilesetJson, args.prettyJson, args.gzip);

        for (let i=0; i < tileNames.length; ++i) {
            const name = tileNames[i] + ext;
            const gltf = gltfs[i];
            await writeTile(tilesetDirectory, name, gltf, args);
        }
    }

    interface TreeBillboardData {
        gltf: Gltf;
        tileWidth: number;
        instancesLength: number;
        embed: boolean;
        modelSize: number;
        createBatchTable: boolean;
        eastNorthUp: boolean;
        transform: Matrix4;
        batchTable?: BatchTable
    }

    export async function createTreeBillboards(args: GeneratorArgs) {
        const ext = args.useGlb
            ? TilesNextExtension.Glb
            : TilesNextExtension.Gltf;

        // tree
        const treeGlb = 'data/tree.glb';
        const treeTileName = 'tree' + ext;

        // tree_billboard
        const treeBillboardGlb = 'data/tree_billboard.glb';
        const treeBillboardTileName = 'tree_billboard' + ext;

        // Billboard effect is coded in the tree_billboard vertex shader
        const tilesetName = 'TilesetWithTreeBillboards';
        const tilesetDirectory =
                path.join(outputDirectory, 'Samples', tilesetName);
        const tilesetPath = path.join(tilesetDirectory, 'tileset.json');
        const treeBillboardGeometricError = 100.0;
        const treeGeometricError = 10.0;
        const treesCount = 25;
        const treesHeight = 20.0;
        const treesTileWidth = tileWidth;
        const treesRegion = [west, south, east, north, 0.0, treesHeight];

        const tree: TreeBillboardData = {
            gltf: await getGltfFromGlbUri(treeGlb, gltfConversionOptions),
            tileWidth : treesTileWidth,
            instancesLength : treesCount,
            embed : true,
            modelSize : treesHeight,
            createBatchTable : true,
            eastNorthUp : true,
            transform:  wgs84Transform(longitude, latitude, 0.0)
        };

        // Billboard model is centered about the origin
        const billboard: TreeBillboardData = {
            gltf: await getGltfFromGlbUri(treeBillboardGlb, gltfConversionOptions),
            tileWidth : treesTileWidth,
            instancesLength : treesCount,
            embed : true,
            modelSize : treesHeight,
            createBatchTable : true,
            eastNorthUp : true,
            transform: wgs84Transform( longitude, latitude, treesHeight / 2.0 )
        };

        const addInstancingExtAndFeatureTable = (data: TreeBillboardData): BatchTable => {
            const positions = InstanceTileUtils.getPositions(
                data.instancesLength,
                data.tileWidth,
                data.modelSize,
                data.transform
            );

            const accessor = data.gltf.accessors.length;
            addBinaryBuffers(data.gltf, positions);
            createEXTMeshInstancingExtension(data.gltf, data.gltf.nodes[0],
                {
                    attributes: {
                        TRANSLATION: accessor
                    }
                });

            const heightData = new Array(data.instancesLength)
                .fill(data.modelSize);

            FeatureMetadata.updateExtensionUsed(data.gltf);

            const primitive = data.gltf.meshes[0].primitives[0];

            FeatureMetadata.addFeatureLayer(primitive, {
                featureTable: 0,
                instanceStride: 1,
                vertexAttribute: {
                    implicit: {
                        increment: 1,
                        start: 0
                    }
                }
            });

            FeatureMetadata.addFeatureTable(data.gltf, {
                featureCount: data.instancesLength,
                properties: {
                    Height: { values: heightData }
                }
            });

            return {
                Height: heightData
            }
        };

        const treeBatchTable = addInstancingExtAndFeatureTable(tree);
        const billboardBatchTable = addInstancingExtAndFeatureTable(billboard);

        // This is unnecessary right now, as the treeBatchTable and
        // billboardBatchTable share the same instance height, but if we
        // ever want to change one of their heights, we'll need `getProperties`
        // to iterate through both arrays to find the true minimum / maximum.

        const concatenatedBatchTable = {
            Height: [...treeBatchTable.Height, ...billboardBatchTable.Height]
        };

        const tilesetJson: TilesetJson = {
            asset : {
                version : tilesNextTilesetJsonVersion
            },
            geometricError : treeBillboardGeometricError,
            root : {
                boundingVolume : {
                    region : treesRegion
                },
                geometricError : treeGeometricError,
                refine : 'REPLACE',
                content : {
                    uri : 'tree_billboard' + ext
                },
                children : [
                    {
                        boundingVolume : {
                            region : treesRegion
                        },
                        geometricError : 0.0,
                        content : {
                            uri : 'tree' + ext
                        }
                    }
                ]
            }
        };
        tilesetJson.properties = getProperties(concatenatedBatchTable);

        await saveJson(tilesetPath, tilesetJson, args.prettyJson, args.gzip);
        await writeTile(tilesetDirectory, treeTileName, tree.gltf, args);
        await writeTile(tilesetDirectory, treeBillboardTileName, billboard.gltf, args);
    }

    export async function createRequestVolume(args: GeneratorArgs) {}

    export async function createExpireTileset(args: GeneratorArgs) {}
}
