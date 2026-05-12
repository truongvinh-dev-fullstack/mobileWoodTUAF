// @ts-ignore
// import filter from "lodash.filter"
import React from 'react';
import {View} from 'react-native';
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import {idName, namkh, images} from "../data"
// import {useNavigation} from '@react-navigation/native';
import {StatusBarHeight} from '../services';

export const AnimalListScreen = () => {
  // const navigation = useNavigation();
  // const [listData, setListData] = useState([]);
  // const [fullData, setFullData] = useState([]);
  // const [query, setQuery] = useState('');

  // useEffect(() => {
  //     setQuery('');

  //     async function fetchAPI() {
  //         await AsyncStorage.getItem('responseJson', (error, result) => {
  //             if (result && result.length) {
  //                 let arr = JSON.parse(result);
  //                 arr.map(item => {
  //                     let start = item?.html_content.indexOf('Tên phổ thông:');
  //                     let end = item?.html_content.indexOf('Tên thương mại:');
  //                     item.name = item?.html_content.slice(start, end);
  //                     item.name = item.name.replace("Tên phổ thông: ", "");
  //                     item.name = item.name.replace("<br />", "");

  //                     item.title = item.name.charAt(0);
  //                     let findIndex = namkh.findIndex(x => x == item?.scientific_name);
  //                     if (findIndex != -1) {

  //                         item.code = idName[findIndex].replace(" ", "");

  //                         // console.log(findIndex,  item.name ,"/", idName[findIndex]);

  //                     } else {
  //                         item.code = null;
  //                         console.log(item?.scientific_name);
  //                     }
  //                     return item;
  //                 });
  //                 arr.sort((a, b) => a.name.localeCompare(b.name));
  //                 // console.log(arr)
  //                 setFullData(arr);
  //                 setListData(arr);
  //             }
  //         });
  //     }

  //     fetchAPI();
  // }, []);

  // const footerComponent = () => {
  //     return (
  //         <View>
  //             {listData.length > 4 ?
  //                 <View style={{backgroundColor: '#efedeb', paddingBottom: 80}}/> :
  //                 listData.length > 1 ?
  //                     <View style={{backgroundColor: '#efedeb', paddingBottom: 12}}/>
  //                     : null}
  //         </View>
  //     )
  // };

  // const topComponent = () => {
  //     return (
  //         <View style={{backgroundColor: 'white', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 12, top: -12}}>
  //             <TextInput
  //                 style={styles.input}
  //                 textStyle={{color: "#000"}}
  //                 clearButtonMode="always"
  //                 placeholder="Tìm kiếm"
  //                 value={query}
  //                 placeholderTextColor='black'
  //                 onChangeText={handleSearch}
  //                 underlineColorAndroid="transparent"/>
  //         </View>
  //     )
  // };

  // const handleSearch = text => {
  //     const formattedQuery = text.toLowerCase();
  //     const data = filter(fullData, item => {
  //         return contains(item, formattedQuery)
  //     });
  //     setListData(data);
  //     setQuery(text)
  // };

  // const contains = (item, query) => {
  //     return item?.name.toLowerCase().includes(query)
  //         || item?.code.toLowerCase().includes(query)
  // };

  return (
    <View
      style={{flex: 1, paddingTop: StatusBarHeight, backgroundColor: 'white'}}>
      {/* <View style={{backgroundColor: 'white', padding: 16, paddingBottom: 10}}>
                <Text style={{fontSize: 16, fontWeight: '500', textTransform: 'uppercase'}}>
                    Danh sách các loại
                </Text>
            </View>
            <FlatList
                columnWrapperStyle={{justifyContent: 'space-between'}}
                keyExtractor={(item, index) => index.toString()}
                numColumns={2}
                style={{backgroundColor: '#efedeb'}}
                data={listData}
                renderItem={({item, index}) => (
                    <View style={[{width: '50%', paddingHorizontal: 6, paddingTop: 12, backgroundColor: '#efedeb'},
                        index % 2 == 0 ? {paddingLeft: 12} : {paddingRight: 12},
                        index == 0 || index == 1 ? {marginTop: -12} : {}
                    ]}>
                        <TouchableOpacity
                            style={{backgroundColor: 'white', borderRadius: 4, flex: 1}}
                            onPress={() => {
                                navigation && navigation.navigate('AnimalDetail', {
                                    data: item
                                })
                            }}>
                            <View style={{width: '100%', height: windowWidth / 2 - 12, backgroundColor: 'green', borderTopLeftRadius: 4, borderTopRightRadius: 4,}}>
                                <Image
                                    resizeMode="stretch"
                                    source={images[item.code]}
                                    style={{width: '100%', height: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4}}/>
                            </View>
                            <View style={{paddingHorizontal: 12, paddingVertical: 12, flex: 1}}>
                                <Text style={{fontSize: 15}}>{item?.name}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
                ListHeaderComponent={topComponent()}
                ListFooterComponent={footerComponent()}
                stickyHeaderIndices={[0]}
            /> */}
    </View>
  );
};
