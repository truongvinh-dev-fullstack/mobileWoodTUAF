/* eslint-disable eqeqeq */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable quotes */
/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useCallback } from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    Image,
    Dimensions,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { styles } from "../styles/";
// @ts-ignore
import Icon from 'react-native-vector-icons/dist/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import {idName, namkh} from "../data"
import LinearGradient from 'react-native-linear-gradient';
import { namkh } from '../data';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import RenderHtml from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

const CAM_PREVIEW_WIDTH = Dimensions.get('window').width;

const labels = require('../../models/class_names_wood.json');

export const ResultScreen = ({ route, navigation }) => {
    const { objectClass, path, imageWidth, imageHeight, boolean, data, type } = route.params;
    const [listData, setListData] = useState(null);
    const [loading, setLoading] = useState(false);
    const isFocus = useIsFocused();
    // const [filter, setFilter] = useState([]);

    useEffect(() => {
        if (isFocus) {
            fetchAPI();
        }
    }, [isFocus]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                // reset state khi màn hình unmount
                setListData(null)
            }
        }, [])
    )

    const fetchAPI = async () => {
        setLoading(true);
        if (objectClass?.toLocaleLowerCase() == 'other') {
            setListData(null);
            setLoading(false);
            return;
        }
        let responseJson: any[] = [];
        await AsyncStorage.getItem('responseJson', (error, result) => {
            if (result) {
                responseJson = JSON.parse(result);
            }
        });
        let _name = '';
        _name = objectClass

        // if (data) {
        //     _name = data.code
        // } else {
        //     _name = objectClass || '';
        //     // _name = _name.trim();
        // }
        console.log("path: ", path)
        console.log("objectClass: ", objectClass)
        console.log('Name: ' + _name);
        let index = labels.findIndex(x => x.toLocaleLowerCase() == _name.toLocaleLowerCase());
        // console.log("index: ", index)
        if (index != -1) {
            let find = responseJson.find(x => x.scientific_name.toLocaleLowerCase() == namkh[index].toLocaleLowerCase());
            // console.log("find", find, namkh[index])
            if (find) {
                setListData(find);
                // let findG = loaiGhep.find(x => x.code == _name);
                // if (findG) {
                //     let filter = loaiGhep.filter(x => x.parentId == findG.parentId);
                //     if (filter.length) {
                //         setFilter(filter)
                //     }
                // }
            } else {

            }
        }
        setLoading(false)
    }
    // const cacheImagePath = `${RNFS.CachesDirectoryPath}/frame_latest.png`;
    // useEffect(() => {
    //     const cacheImagePath = `${RNFS.CachesDirectoryPath}/frame_latest.png`;
    // },[])

    return (
        <SafeAreaView style={resultStyles.container} edges={['top', 'bottom']}>
            {
                loading &&
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#125fa1" />
                </View>
            }
            <View style={{ flex: 1, backgroundColor: 'white', }}>
                <ScrollView style={{ flex: 1 }}>
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
                        {path ?
                            <View style={[boolean ? { transform: [{ scaleX: -1 }] } : {}, {
                                height: CAM_PREVIEW_WIDTH,
                                width: CAM_PREVIEW_WIDTH,
                                backgroundColor: 'green',
                            }]}>
                                <Image source={path} resizeMode="cover" style={{ height: CAM_PREVIEW_WIDTH, width: CAM_PREVIEW_WIDTH }} />
                                {/* {!path ? <Image source={{ uri: 'file://' + cacheImagePath + `?t=${Date.now()}` }} resizeMode="cover" style={{height: CAM_PREVIEW_WIDTH, width: CAM_PREVIEW_WIDTH}}/> : <Image source={path} resizeMode="cover" style={{height: CAM_PREVIEW_WIDTH, width: CAM_PREVIEW_WIDTH}}/>} */}
                            </View>
                            : null
                        }
                    </View>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: 'white', height: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16, marginTop: -16, zIndex: 30 }}>
                        {!loading ?
                            listData ?
                                <View>
                                    <RenderHtml contentWidth={CAM_PREVIEW_WIDTH} source={{ html: listData?.html_content }} />
                                    {/* {filter.length ?
                                        <View style={{borderTopWidth: 1, borderColor: 'gray', paddingTop: 16}}>
                                            {renderRow()}
                                        </View>
                                        : null} */}
                                </View> :
                                <View style={{ flex: 1, justifyContent: 'flex-start', width: '100%', zIndex: 999 }}>
                                    <Text style={{ color: 'black', fontSize: 18, fontWeight: '500', marginTop: 16, marginLeft: 8 }}>{objectClass && objectClass != "other" ? objectClass : "Không nhận dạng được"}</Text>
                                </View>
                            // <View style={{flex: 1, justifyContent: 'flex-start', width: '100%', zIndex: 999}}>
                            //     {!loading ?
                            //         <Text style={{color: 'black', fontSize: 18, fontWeight: '500', marginTop: 16, marginLeft: 8}}>Không nhận dạng được 1</Text>
                            //         : null}
                            // </View>
                            : null
                        }


                    </View>
                </ScrollView>
                <TouchableOpacity style={styles.btnBackWrapper}
                    onPress={() => {
                        // if (data) {
                        //     navigation.goBack()
                        // } else {
                        //     navigation.navigate('Home', {type, camera: false})
                        // }
                        navigation.navigate('Home', { type, camera: false })
                    }}>
                    <View style={styles.btnBack}>
                        <Icon style={styles.btnBackIcon} name="chevron-left" size={13} color="white" />
                    </View>
                </TouchableOpacity>
                <View style={{ paddingHorizontal: 32, paddingVertical: 16 }}>
                    <LinearGradient colors={['#2da44e', 'green']} style={{ borderRadius: 32, paddingHorizontal: 16, paddingVertical: 12 }}>
                        <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                            onPress={() => { navigation && navigation.navigate('Home', { type, camera: true }) }}>
                            <Icon style={{ marginRight: 12 }} name="camera" size={24} color="white" />
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: '500' }}>Quay ảnh</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </View>
        </SafeAreaView>
    );
};

export const resultStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    border: {
        borderWidth: 0.5,
        borderColor: 'black'
    }
});
