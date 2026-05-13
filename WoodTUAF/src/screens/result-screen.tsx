/* eslint-disable eqeqeq */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable quotes */
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
import { styles } from '../styles/';
// import {idName, namkh} from "../data"
import LinearGradient from 'react-native-linear-gradient';
import { namkh } from '../data';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import RenderHtml from 'react-native-render-html';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCachedWoodSpecies } from '../services/wood-library-service';
import { StatusBarHeight } from '../services';

const CAM_PREVIEW_WIDTH = Dimensions.get('window').width;

const labels = require('../../models/class_names_wood.json');

const formatConfidencePercent = (value: number) => {
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
};

export const ResultScreen = ({ route, navigation }: any) => {
  const { objectClass, path, boolean, type, confidence } = route.params;
  const [listData, setListData] = useState<any>(null);
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
        setListData(null);
      };
    }, []),
  );

  const fetchAPI = async () => {
    setLoading(true);
    const responseJson = await getCachedWoodSpecies();
    let _name = '';
    _name = objectClass;

    // if (data) {
    //     _name = data.code
    // } else {
    //     _name = objectClass || '';
    //     // _name = _name.trim();
    // }
    console.log('path: ', path);
    console.log('objectClass: ', objectClass);
    console.log('Name: ' + _name);
    let index = labels.findIndex(
      (x: string) => x.toLocaleLowerCase() == _name.toLocaleLowerCase(),
    );
    // console.log("index: ", index)
    if (index != -1) {
      let find = responseJson.find(
        x =>
          x.scientificName.toLocaleLowerCase() ==
          namkh[index].toLocaleLowerCase(),
      );
      // console.log("find", find, namkh[index])
      if (find) {
        setListData({
          scientific_name: find.scientificName,
          html_content: find.htmlContent,
          vietnameseName: find.vietnameseName,
        });
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
    setLoading(false);
  };
  // const cacheImagePath = `${RNFS.CachesDirectoryPath}/frame_latest.png`;
  // useEffect(() => {
  //     const cacheImagePath = `${RNFS.CachesDirectoryPath}/frame_latest.png`;
  // },[])

  return (
    <>
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#125fa1" />
        </View>
      )}
      <View
        style={{
          flex: 1,
          backgroundColor: 'white',
          paddingTop: StatusBarHeight,
        }}>
        <ScrollView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}>
            <View
              style={[
                boolean ? { transform: [{ scaleX: -1 }] } : {},
                {
                  height: CAM_PREVIEW_WIDTH,
                  width: CAM_PREVIEW_WIDTH,
                  backgroundColor: 'green',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}>
              {path ? (
                <Image
                  source={path}
                  resizeMode="cover"
                  style={{ height: CAM_PREVIEW_WIDTH, width: CAM_PREVIEW_WIDTH }}
                />
              ) : (
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Không có ảnh kết quả
                </Text>
              )}
              {/* {!path ? <Image source={{ uri: 'file://' + cacheImagePath + `?t=${Date.now()}` }} resizeMode="cover" style={{height: CAM_PREVIEW_WIDTH, width: CAM_PREVIEW_WIDTH}}/> : <Image source={path} resizeMode="cover" style={{height: CAM_PREVIEW_WIDTH, width: CAM_PREVIEW_WIDTH}}/>} */}
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 16,
              backgroundColor: 'white',
              height: '100%',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              marginTop: -16,
              zIndex: 30,
            }}>
            {!loading ? (
              listData ? (
                <View>
                  {typeof confidence === 'number' ? (
                    <Text
                      style={{
                        color: '#07923f',
                        fontSize: 14,
                        fontWeight: '700',
                        marginBottom: 10,
                        marginLeft: 3,
                      }}>
                      Độ chính xác: {formatConfidencePercent(confidence)}
                    </Text>
                  ) : null}
                  <RenderHtml
                    contentWidth={CAM_PREVIEW_WIDTH}
                    source={{ html: listData?.html_content }}
                  />
                  {/* {filter.length ?
                                        <View style={{borderTopWidth: 1, borderColor: 'gray', paddingTop: 16}}>
                                            {renderRow()}
                                        </View>
                                        : null} */}
                </View>
              ) : (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'flex-start',
                    width: '100%',
                    zIndex: 999,
                  }}>
                  <Text
                    style={{
                      color: 'black',
                      fontSize: 18,
                      fontWeight: '500',
                      marginTop: 16,
                      marginLeft: 8,
                    }}>
                    {objectClass && objectClass != 'other'
                      ? objectClass
                      : 'Không nhận dạng được'}
                  </Text>

                </View>
              )
            ) : // <View style={{flex: 1, justifyContent: 'flex-start', width: '100%', zIndex: 999}}>
              //     {!loading ?
              //         <Text style={{color: 'black', fontSize: 18, fontWeight: '500', marginTop: 16, marginLeft: 8}}>Không nhận dạng được 1</Text>
              //         : null}
              // </View>
              null}
          </View>
        </ScrollView>
        <TouchableOpacity
          style={styles.btnBackWrapper}
          onPress={() => {
            // if (data) {
            //     navigation.goBack()
            // } else {
            //     navigation.navigate('Home', {type, camera: false})
            // }
            navigation.navigate('Home', { type, camera: false });
          }}>
          <View style={styles.btnBack}>
            <Ionicons name={'arrow-back-outline'} size={24} color={'white'} />
          </View>
        </TouchableOpacity>
        <View style={{ paddingHorizontal: 32, paddingVertical: 16 }}>
          <LinearGradient
            colors={['#2da44e', 'green']}
            style={{
              borderRadius: 32,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                navigation && navigation.navigate('Home', { type, camera: true });
              }}>
              <Ionicons name={'camera'} size={24} color={'white'} />
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '500' }}>
                Quay ảnh
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </>
  );
};

export const resultStyles = StyleSheet.create({
  border: {
    borderWidth: 0.5,
    borderColor: 'black',
  },
});
