import React, { Component,useRef,useState, useEffect } from 'react';
import { Alert, BackHandler, StyleSheet,StatusBar,Image, Dimensions, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import ExitBottomSheet from '../components/ExitBottomSheet';
import {
   heightPercentageToDP as hp,
   widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';
import {grade9Data} from '../utils/subjects/grade9Data';
import styles from "./style";

const width = Dimensions.get('window').width;

const Homescreen = (props) => {
   const bottomSheet = useRef();
   const [showRetrieve, setShowRetrieve] = useState(false);

   useEffect(() => {
      BackHandler.addEventListener('hardwareBackPress', handleBackButtonClick);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', handleBackButtonClick);
      };
    }, []);

    function handleBackButtonClick() {
      bottomSheet.current.show()
      // navigation.goBack();
       return true;
    }



   const navigation = useNavigation();
     const [darkMode, setDarkMode] = useState(false);
  
   
 
  
   const getRandomColor = (id) => {
      let ids = parseInt(id)
      let shade;

      if (ids % 2 === 0) {
          shade = `#3858CF`;
      } else {
          shade =  `#469D00`;
      }
      return shade
  }

const exitApp = () =>{
BackHandler.exitApp();
}

  const generateColor = () => {
   const CHHAPOLA = Math.floor(Math.random() * 16777215)
     .toString(16)
     .padStart(6, '0');
   return `#${CHHAPOLA}`;
 };






 
      return (
         <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
             <StatusBar barStyle="light-content" backgroundColor='#000' hidden={false} />
             {
               darkMode ?
               <View style={styles.darkBg}>
               <View style={styles.topCover}>
               <View style={styles.topLeft}>
                  <Image source={require('../assets/logo.png')} style={styles.leftLogo} />
               </View>
               <View style={styles.topRight}>
                  <Text style={styles.topTitleDarkBg}>WELCOME TO 3RD TERM</Text>
                  <Text style={styles.bottomTitleDarkBg}>GRADE 8</Text>
                   <View style={styles.modeCover}>
                     <Text style={styles.modeCaptionDarkBg}>Change Reading Mode</Text>
                           <ToggleSwitch
                        isOn={darkMode}
                        onColor="#12B76A"
                        offColor="#dddfff"
                        thumbOnStyle={styles.thumbOnStyle}
                        thumbOffStyle={styles.thumbOffStyle}
                        trackOnStyle={styles.trackOnStyle}
                        trackOffStyle={styles.trackOffStyle}
                        labelStyle={{color: 'black', fontWeight: '900'}}
                        size="small"
                        onToggle={isOnDefaultToggleSwitch => {
                           setDarkMode(!darkMode);
                        }}
                        />
                  </View>
               </View>
          
            </View>

            <View style={styles.bottomCover} >
               <ScrollView vertical={true} ref={(scrollView) => { scrollView = scrollView; }} showsHorizontalScrollIndicator={false}>
                  <View style={styles.mainContainer}>
                     {grade9Data && grade9Data.length > 0 && grade9Data.map(subject => {
                        return (
                           <View key={subject.id} >
                           <View style={[styles.card, {backgroundColor : generateColor(subject.id)}]}>
                                 <Image source={require('../assets/study.png')} style={styles.subLogo} />
                                 <Text style={styles.sub}>{subject.name}</Text>
                                 <TouchableOpacity style={styles.tapBtnDarkBg} onPress={() => navigation.navigate('SubjectDetails', {filepath: subject.filepath, subjectname: subject.name, subjectId: subject.id})}>
                                 <View >
                                    <Text style={{color:"#fff"}}>Read</Text>
                              </View>
                              </TouchableOpacity>
                              </View>
                           </View>  
                       
                        )
                     })}
                  </View>
               </ScrollView>

            </View>

</View>
            :
            <>
            <View style={styles.topCover}>
            <View style={styles.topLeft}>
               <Image source={require('../assets/logo.png')} style={styles.leftLogo} />
            </View>
            <View style={styles.topRight}>
               <Text style={styles.topTitle}>WELCOME TO 3RD TERM</Text>
               <Text style={styles.bottomTitle}>GRADE 8</Text>
                <View style={styles.modeCover}>
                  <Text style={styles.modeCaption}>Change Reading Mode</Text>
                        <ToggleSwitch
                     isOn={darkMode}
                     onColor="#12B76A"
                     offColor="#dddfff"
                     thumbOnStyle={styles.thumbOnStyle}
                     thumbOffStyle={styles.thumbOffStyle}
                     trackOnStyle={styles.trackOnStyle}
                     trackOffStyle={styles.trackOffStyle}
                     labelStyle={{color: 'black', fontWeight: '900'}}
                     size="small"
                     onToggle={isOnDefaultToggleSwitch => {
                        setDarkMode(!darkMode);
                     }}
                     />
               </View>
            </View>
       
         </View>

         <View style={styles.bottomCover} >
            <ScrollView vertical={true} ref={(scrollView) => { scrollView = scrollView; }} showsHorizontalScrollIndicator={false}>
               <View style={styles.mainContainer}>
                  {grade9Data && grade9Data.length > 0 && grade9Data.map(subject => {
                     return (
                        <View key={subject.id} >
                        <View style={[styles.card, {backgroundColor : generateColor(subject.id)}]}>
                              <Image source={require('../assets/study.png')} style={styles.subLogo} />
                              <Text style={styles.sub}>{subject.name}</Text>
                              <TouchableOpacity style={styles.tapBtn} onPress={() => navigation.navigate('SubjectDetails', {filepath: subject.filepath, subjectname: subject.name, subjectId: subject.id})}>
                              <View >
                                 <Text style={{color:"#000"}}>Read</Text>
                           </View>
                           </TouchableOpacity>
                           </View>
                        </View>  
                    
                     )
                  })}
               </View>
            </ScrollView>

         </View>
         

         </>
             }
         
         <ExitBottomSheet
          bottomSheet={bottomSheet}
          yes={() =>exitApp()}
          no={()=> bottomSheet.current.close()}
      />
         </View>
         
      )
      

}

export default Homescreen;


